/**
 * Batch price scraper — fetches live prices from 1mg, PharmEasy, Apollo, Netmeds.
 * Reads medicines from Supabase and upserts results into the prices table.
 *
 * Usage:
 *   node scripts/scrape-prices.cjs                  # scrape top 20 medicines
 *   node scripts/scrape-prices.cjs --limit 50        # scrape top 50
 *   node scripts/scrape-prices.cjs --slug dolo-650   # single medicine
 *   node scripts/scrape-prices.cjs --pharmacy 1mg    # only one pharmacy
 *   node scripts/scrape-prices.cjs --dry-run         # no DB writes
 */
const { createClient } = require('@supabase/supabase-js')
const { existsSync, readFileSync } = require('fs')
const path = require('path')
const { chromium } = require('playwright')

loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const sep = t.indexOf('=')
    if (sep <= 0) continue
    const k = t.slice(0, sep).trim()
    let v = t.slice(sep + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!(k in process.env)) process.env[k] = v
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = flag => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : null
  }
  return {
    limit: parseInt(get('--limit') ?? '20', 10),
    offset: parseInt(get('--offset') ?? '0', 10),
    slug: get('--slug'),
    pharmacy: get('--pharmacy'),
    dryRun: args.includes('--dry-run'),
  }
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parsePrice(text) {
  if (!text) return null
  const n = parseFloat(text.replace(/[^0-9.]/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

function extractProductFromJson(json) {
  try {
    const list =
      json?.data?.skus ??
      json?.data?.products ??
      json?.skus ??
      json?.products ??
      json?.items ??
      json?.data?.products?.items ??
      null

    if (!Array.isArray(list) || list.length === 0) return null

    const p = list[0]
    const rawPrice =
      p?.selling_price ?? p?.price ?? p?.sp ?? p?.discounted_price ??
      p?.price_range?.minimum_price?.final_price?.value ?? p?.special_price

    const price = parsePrice(String(rawPrice ?? ''))
    if (!price) return null

    const slug = p?.url_key ?? p?.slug ?? p?.url ?? ''
    return { price, slug, inStock: !(p?.is_out_of_stock ?? p?.outOfStock ?? false) }
  } catch {
    return null
  }
}

async function scrapeWithInterception(page, pharmacyDomain) {
  const hits = []
  page.on('response', async res => {
    if (!res.url().includes(pharmacyDomain)) return
    if (!(res.headers()['content-type'] ?? '').includes('json')) return
    try { hits.push(await res.json()) } catch {}
  })
  return hits
}

async function scrape1mg(browser, name, strength) {
  // Confirmed API from debug: pwa-dweb-api/api/v4/search/all
  // Response: { data: { search_results: [{ prices: { mrp, discounted_price }, url, available }] } }
  const q = strength ? `${name} ${strength}` : name
  const url = `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}&filter=true&type=medicine`
  const ctx = await browser.newContext({ userAgent: UA })
  const page = await ctx.newPage()

  let apiResult = null
  page.on('response', async res => {
    if (!res.url().includes('pwa-dweb-api') || !res.url().includes('search/all')) return
    try {
      const json = await res.json()
      const results = json?.data?.search_results ?? []
      if (results.length > 0 && !apiResult) apiResult = results[0]
    } catch {}
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(1500)

    if (apiResult) {
      const prices = apiResult.prices ?? {}
      const price = parsePrice(prices.discounted_price) ?? parsePrice(prices.mrp)
      const slug = apiResult.url ?? ''
      return { pharmacy: '1mg', price, url: slug ? `https://www.1mg.com${slug}` : null, inStock: apiResult.available !== false }
    }

    // DOM fallback — find any leaf ₹ element
    const priceText = await page.evaluate(() => {
      const els = [...document.querySelectorAll('span,b,p')]
      for (const el of els) {
        const t = (el.textContent ?? '').trim()
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && el.children.length === 0) return t
      }
      return null
    })
    const price = parsePrice(priceText)
    const productUrl = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/drugs/"]')
      return a ? a.href : null
    })
    return { pharmacy: '1mg', price, url: productUrl, inStock: price !== null }
  } finally {
    await ctx.close()
  }
}

async function scrapePharmeasy(browser, name, strength) {
  const q = strength ? `${name} ${strength}` : name
  const url = `https://pharmeasy.in/search/all?name=${encodeURIComponent(q)}`
  const ctx = await browser.newContext({ userAgent: UA })
  const page = await ctx.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(2000)

    const nextData = await page.evaluate(() => {
      try { return JSON.parse(document.getElementById('__NEXT_DATA__')?.textContent ?? '') } catch { return null }
    })

    if (nextData) {
      // Confirmed path from debug: props.pageProps.searchResults[0].salePriceDecimal
      const searchResults = nextData?.props?.pageProps?.searchResults ?? []
      const p = searchResults.find(p => p.type !== 'OTC_DEVICE') ?? searchResults[0]
      if (p) {
        const price = p.salePriceDecimal ?? p.assuredDiscountPrice ?? p.mrpDecimal ?? null
        const slug = p.slug ?? p.urlSlug ?? ''
        return {
          pharmacy: 'pharmeasy',
          price: price && price > 0 ? price : null,
          url: slug ? `https://pharmeasy.in/online-pharmacy/medicines/${slug}` : null,
          inStock: price !== null,
        }
      }
    }

    // DOM fallback — MRP span (PharmEasy shows striked MRP; sale price needs different class)
    const priceText = await page.evaluate(() => {
      // Look for sale price first (not striked)
      const allSpans = [...document.querySelectorAll('span')]
      for (const el of allSpans) {
        const t = (el.textContent ?? '').trim()
        const cls = el.className ?? ''
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && !cls.includes('striked') && !cls.includes('mrp') && el.children.length === 0) return t
      }
      // Fallback: any ₹ element
      for (const el of allSpans) {
        const t = (el.textContent ?? '').trim()
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && el.children.length === 0) return t
      }
      return null
    })
    const price = parsePrice(priceText)
    const productUrl = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/online-pharmacy/medicines/"]')
      return a ? a.href : null
    })
    return { pharmacy: 'pharmeasy', price, url: productUrl, inStock: price !== null }
  } finally {
    await ctx.close()
  }
}

async function scrapeApollo(browser, name, strength) {
  const q = strength ? `${name} ${strength}` : name
  const url = `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(q)}`
  const ctx = await browser.newContext({
    userAgent: UA,
    geolocation: { latitude: 28.6139, longitude: 77.209 },
    permissions: ['geolocation'],
  })
  const page = await ctx.newPage()
  const hits = await scrapeWithInterception(page, 'apollopharmacy')

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(3000)

    for (const json of hits) {
      const p = extractProductFromJson(json)
      if (p) return { pharmacy: 'apollo', price: p.price, url: null, inStock: p.inStock }
    }

    const priceText = await page.evaluate(() => {
      const els = [...document.querySelectorAll('span,p,div')]
      for (const el of els) {
        const t = (el.textContent ?? '').trim()
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && el.children.length === 0) return t
      }
      return null
    })
    const price = parsePrice(priceText)
    const productUrl = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/otc/"], a[href*="-bp-"]')
      return a ? a.href : null
    })
    return { pharmacy: 'apollo', price, url: productUrl, inStock: price !== null }
  } finally {
    await ctx.close()
  }
}

async function scrapeNetmeds(browser, name, strength) {
  // Confirmed: Netmeds moved to Fynd platform. Search URL is /products?q=
  // Price API: /api/service/application/catalog/v3.0/products/{slug}/size*
  // Response: { items: [{ price: { effective, marked } }] }
  const q = strength ? `${name} ${strength}` : name
  const searchUrl = `https://www.netmeds.com/products?q=${encodeURIComponent(q)}`
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  const priceHits = []
  page.on('response', async res => {
    const u = res.url()
    if (!u.includes('netmeds')) return
    if (!(res.headers()['content-type'] ?? '').includes('json')) return
    if (!u.includes('/catalog/') && !u.includes('/products/')) return
    try {
      const json = await res.json()
      const items = json?.items ?? []
      for (const item of items) {
        const price = parsePrice(item?.price?.effective) ?? parsePrice(item?.price_per_piece?.effective)
        if (price) {
          const m = u.match(/\/products\/([^/]+)\//)
          priceHits.push({ price, slug: m?.[1] ?? '' })
          return
        }
      }
    } catch {}
  })

  try {
    // Homepage first to establish session
    await page.goto('https://www.netmeds.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(500)

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForFunction(
      () => document.querySelectorAll('a[href*="/prescriptions/"], a[href*="/non-prescriptions/"]').length > 0,
      { timeout: 8000 }
    ).catch(() => null)
    await page.waitForTimeout(1500)

    if (priceHits.length > 0) {
      const { price, slug } = priceHits[0]
      return {
        pharmacy: 'netmeds',
        price,
        url: slug ? `https://www.netmeds.com/prescriptions/${slug}` : null,
        inStock: true,
      }
    }

    // DOM fallback
    const priceText = await page.evaluate(() => {
      const all = [...document.querySelectorAll('span,p,div')]
      for (const el of all) {
        const t = (el.textContent ?? '').trim()
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && el.children.length === 0) return t
      }
      return null
    })
    const price = parsePrice(priceText)
    const productUrl = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/prescriptions/"], a[href*="/non-prescriptions/"]')
      return a ? a.href : null
    })
    return { pharmacy: 'netmeds', price, url: productUrl, inStock: price !== null }
  } finally {
    await ctx.close()
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────────

const PHARMACIES = {
  '1mg': scrape1mg,
  pharmeasy: scrapePharmeasy,
  apollo: scrapeApollo,
  netmeds: scrapeNetmeds,
}

function cleanSearchName(medicine) {
  // NPPA brand_name is a full description; use salt_name for pharmacy search
  const raw = (medicine.salt_name || medicine.brand_name || '').trim()
  // Keep only the first active ingredient (before '+', '/', parentheses)
  const primary = raw.split(/\s*[+/]\s*/)[0].split('(')[0].trim()
  // Strip trailing manufacturer noise (starts with "manufactured", "marketed", "M/s")
  const clean = primary.replace(/\s+(manufactured|marketed|m\s*\/?s|by).*/i, '').trim()
  return clean.slice(0, 60) || raw.slice(0, 60)
}

async function scrapeMedicine(browser, medicine, pharmacyFilter, dryRun) {
  const name = cleanSearchName(medicine)
  const strength = medicine.strength || null

  const scrapers = pharmacyFilter
    ? { [pharmacyFilter]: PHARMACIES[pharmacyFilter] }
    : PHARMACIES

  const results = await Promise.allSettled(
    Object.entries(scrapers).map(async ([pharmacy, fn]) => {
      const result = await fn(browser, name, strength)
      return { pharmacy, ...result }
    })
  )

  const rows = []
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error(`    ${r.reason?.message ?? r.reason}`)
      continue
    }
    const { pharmacy, price, url, inStock } = r.value
    const tag = price ? `₹${price}` : 'no price'
    console.log(`    ${pharmacy.padEnd(12)} ${tag}`)
    rows.push({
      medicine_id: medicine.id,
      pharmacy,
      price: price ?? null,
      price_per_unit: null,
      url: url ?? null,
      in_stock: inStock,
      scraped_at: new Date().toISOString(),
    })
  }

  if (!dryRun && rows.length > 0) {
    const { error } = await supabase
      .from('prices')
      .upsert(rows, { onConflict: 'medicine_id,pharmacy' })
    if (error) console.error(`    DB error: ${error.message}`)
  }

  return rows
}

async function loadMedicines(slug, limit, offset) {
  if (slug) {
    const { data, error } = await supabase
      .from('medicines')
      .select('id, brand_name, salt_name, strength, slug')
      .eq('slug', slug)
      .single()
    if (error) throw new Error(`Medicine not found: ${slug}`)
    return [data]
  }

  const { data, error } = await supabase
    .from('medicines')
    .select('id, brand_name, salt_name, strength, slug')
    .not('nppa_ceiling', 'is', null)
    .order('brand_name')
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data ?? []
}

async function main() {
  const { limit, offset, slug, pharmacy, dryRun } = parseArgs()

  console.log('=== MedCompare Price Scraper ===')
  if (dryRun) console.log('DRY RUN — no DB writes')
  console.log()

  const medicines = await loadMedicines(slug, limit, offset)
  console.log(`Medicines to scrape: ${medicines.length}`)
  if (pharmacy) console.log(`Pharmacy filter: ${pharmacy}`)
  console.log()

  const browser = await chromium.launch({ headless: true })
  let totalPrices = 0
  let scraped = 0

  try {
    for (const med of medicines) {
      console.log(`[${++scraped}/${medicines.length}] ${med.brand_name || med.salt_name}`)
      const rows = await scrapeMedicine(browser, med, pharmacy, dryRun)
      const found = rows.filter(r => r.price !== null).length
      totalPrices += found
      // Polite delay between medicines
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))
    }
  } finally {
    await browser.close()
  }

  console.log(`\n=== Done ===`)
  console.log(`Medicines scraped: ${scraped}`)
  console.log(`Prices found:      ${totalPrices}`)

  if (!dryRun) {
    const { count } = await supabase
      .from('prices')
      .select('*', { count: 'exact', head: true })
    console.log(`Total prices in DB: ${count}`)
  }
}

module.exports = { scrapeMedicine }

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err.message)
    process.exit(1)
  })
}
