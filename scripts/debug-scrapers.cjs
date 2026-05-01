/**
 * Debug scraper — captures screenshots, all JSON API responses, and DOM structure
 * for each pharmacy search page so we can fix the selectors.
 *
 * Usage:
 *   node scripts/debug-scrapers.cjs --query "Paracetamol 500mg" --pharmacy 1mg
 *   node scripts/debug-scrapers.cjs --query "Metformin" --pharmacy pharmeasy
 *   node scripts/debug-scrapers.cjs --query "Azithromycin" --pharmacy all
 */
const { chromium } = require('playwright')
const { writeFileSync, mkdirSync, existsSync } = require('fs')
const path = require('path')

const OUT = path.resolve(process.cwd(), 'data/debug-scrapers')
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parseArgs() {
  const args = process.argv.slice(2)
  const get = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null }
  return {
    query: get('--query') ?? 'Paracetamol 500mg',
    pharmacy: get('--pharmacy') ?? 'all',
  }
}

const PHARMACIES = {
  '1mg': q => `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}&filter=true&type=medicine`,
  pharmeasy: q => `https://pharmeasy.in/search/all?name=${encodeURIComponent(q)}`,
  apollo: q => `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(q)}`,
  netmeds: q => `https://www.netmeds.com/catalogsearch/result?q=${encodeURIComponent(q)}`,
}

async function debugPharmacy(name, url, query) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Pharmacy: ${name}`)
  console.log(`URL: ${url}`)
  console.log('='.repeat(60))

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
    ...(name === 'apollo' ? {
      geolocation: { latitude: 28.6139, longitude: 77.209 },
      permissions: ['geolocation'],
    } : {}),
  })
  const page = await ctx.newPage()

  const apiResponses = []
  const allRequests = []

  page.on('request', req => {
    const u = req.url()
    if (u.includes('google') || u.includes('font') || u.includes('analytics') || u.includes('gtm')) return
    allRequests.push({ method: req.method(), url: u, postData: req.postData()?.slice(0, 200) })
  })

  page.on('response', async res => {
    const u = res.url()
    if (u.includes('google') || u.includes('font') || u.includes('analytics') || u.includes('gtm')) return
    const ct = res.headers()['content-type'] ?? ''
    if (ct.includes('json')) {
      try {
        const json = await res.json()
        apiResponses.push({ url: u, status: res.status(), body: json })
      } catch {}
    }
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // Screenshot
    const screenshotPath = path.join(OUT, `${name}-search.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`Screenshot saved: ${screenshotPath}`)

    // __NEXT_DATA__
    const nextData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__')
      if (!el) return null
      try { return JSON.parse(el.textContent ?? '') } catch { return null }
    })
    if (nextData) {
      const nd = JSON.stringify(nextData, null, 2)
      const ndPath = path.join(OUT, `${name}-next-data.json`)
      writeFileSync(ndPath, nd.slice(0, 200000)) // cap at 200KB
      console.log(`__NEXT_DATA__ saved (${Math.round(nd.length / 1024)}KB): ${ndPath}`)

      // Try to find price-looking fields
      const priceKeys = findPriceKeys(nextData)
      if (priceKeys.length > 0) {
        console.log('Price-like fields in __NEXT_DATA__:')
        priceKeys.forEach(k => console.log(`  ${k}`))
      }
    } else {
      console.log('No __NEXT_DATA__ found')
    }

    // Window variables
    const windowVars = await page.evaluate(() => {
      const w = window
      const interesting = {}
      for (const k of ['__REDUX_STATE__', '__APOLLO_STATE__', '__PRELOADED_STATE__', '__INITIAL_STATE__', '__store', 'dataLayer']) {
        if (w[k]) interesting[k] = JSON.stringify(w[k]).slice(0, 500)
      }
      return interesting
    })
    if (Object.keys(windowVars).length > 0) {
      console.log('Window variables found:', Object.keys(windowVars).join(', '))
      writeFileSync(path.join(OUT, `${name}-window-vars.json`), JSON.stringify(windowVars, null, 2))
    }

    // DOM: find elements with price-like content
    const priceElements = await page.evaluate(() => {
      const results = []
      const all = document.querySelectorAll('*')
      for (const el of all) {
        const t = (el.textContent ?? '').trim()
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && el.children.length === 0) {
          results.push({
            tag: el.tagName.toLowerCase(),
            classes: el.className,
            text: t,
            parentClasses: el.parentElement?.className ?? '',
          })
          if (results.length >= 10) break
        }
      }
      return results
    })

    if (priceElements.length > 0) {
      console.log(`\nFound ${priceElements.length} price-looking DOM elements:`)
      priceElements.forEach((el, i) => {
        console.log(`  [${i + 1}] <${el.tag}> "${el.text}"`)
        console.log(`       class="${el.classes.slice(0, 80)}"`)
        console.log(`       parent class="${el.parentClasses.slice(0, 80)}"`)
      })
    } else {
      console.log('\nNo ₹-price DOM elements found on page')
    }

    // DOM: product card structure
    const productCards = await page.evaluate(() => {
      // Look for repeated card-like structures
      const candidates = [
        '[class*="ProductCard"]', '[class*="product-card"]', '[class*="medicine-card"]',
        '[class*="result"]', '[class*="Medicine"]', '[class*="item"]',
        'article', '[data-testid*="product"]', 'li.item',
      ]
      for (const sel of candidates) {
        const els = document.querySelectorAll(sel)
        if (els.length > 0) {
          const el = els[0]
          return {
            selector: sel,
            count: els.length,
            outerHTML: el.outerHTML.slice(0, 800),
            className: el.className,
          }
        }
      }
      return null
    })

    if (productCards) {
      console.log(`\nProduct card found: selector="${productCards.selector}" count=${productCards.count}`)
      console.log(`  class="${productCards.className.slice(0, 100)}"`)
      const cardPath = path.join(OUT, `${name}-product-card.html`)
      writeFileSync(cardPath, productCards.outerHTML)
      console.log(`  HTML saved: ${cardPath}`)
    } else {
      // Dump page text to help understand structure
      const pageText = await page.evaluate(() => document.body.innerText.slice(0, 2000))
      console.log('\nPage text preview:')
      console.log(pageText.slice(0, 500))
    }

    // API responses summary
    console.log(`\nAPI responses intercepted: ${apiResponses.length}`)
    if (apiResponses.length > 0) {
      const apiPath = path.join(OUT, `${name}-api-responses.json`)
      writeFileSync(apiPath, JSON.stringify(apiResponses.slice(0, 20), null, 2).slice(0, 500000))
      console.log(`Saved to: ${apiPath}`)

      // Look for product arrays in responses
      for (const r of apiResponses) {
        const products = findProductArray(r.body)
        if (products) {
          console.log(`\nProduct array found in API response!`)
          console.log(`  URL: ${r.url}`)
          console.log(`  Count: ${products.length} items`)
          if (products[0]) {
            console.log(`  First item keys: ${Object.keys(products[0]).slice(0, 15).join(', ')}`)
            const priceKey = Object.keys(products[0]).find(k =>
              k.toLowerCase().includes('price') || k.toLowerCase().includes('mrp') || k === 'sp'
            )
            if (priceKey) console.log(`  Price field: "${priceKey}" = ${products[0][priceKey]}`)
          }
        }
      }
    }

    // Requests summary
    console.log(`\nAll requests (${allRequests.length} total):`)
    const searchRelated = allRequests.filter(r =>
      r.url.includes('search') || r.url.includes('product') || r.url.includes('catalog') || r.url.includes('query')
    )
    searchRelated.slice(0, 10).forEach(r => console.log(`  ${r.method} ${r.url.slice(0, 120)}`))

  } catch (err) {
    console.error(`Error: ${err.message}`)
  } finally {
    await browser.close()
  }
}

function findProductArray(obj, depth = 0) {
  if (depth > 6 || !obj || typeof obj !== 'object') return null
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
    const keys = Object.keys(obj[0] ?? {})
    // A "product array" has price-like or name-like keys
    const hasPrice = keys.some(k => /price|mrp|sp|amount/i.test(k))
    const hasName = keys.some(k => /name|title|product|drug|medicine/i.test(k))
    if (hasPrice && hasName) return obj
  }
  for (const v of Object.values(obj)) {
    const found = findProductArray(v, depth + 1)
    if (found) return found
  }
  return null
}

function findPriceKeys(obj, path = '', depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return []
  const results = []
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k
    if (/price|mrp|sp|amount|cost/i.test(k) && (typeof v === 'number' || typeof v === 'string')) {
      if (v && String(v).match(/^\d/)) results.push(`${p} = ${v}`)
    }
    if (typeof v === 'object' && v !== null) {
      results.push(...findPriceKeys(v, p, depth + 1))
    }
  }
  return results.slice(0, 20)
}

async function main() {
  const { query, pharmacy } = parseArgs()
  console.log(`Query: "${query}"`)
  console.log(`Output directory: ${OUT}`)

  const targets = pharmacy === 'all'
    ? Object.entries(PHARMACIES)
    : [[pharmacy, PHARMACIES[pharmacy]]].filter(([, fn]) => fn)

  if (targets.length === 0) {
    console.error(`Unknown pharmacy: ${pharmacy}. Choose from: ${Object.keys(PHARMACIES).join(', ')}, all`)
    process.exit(1)
  }

  for (const [name, urlFn] of targets) {
    await debugPharmacy(name, urlFn(query), query)
    if (targets.length > 1) await new Promise(r => setTimeout(r, 2000))
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
