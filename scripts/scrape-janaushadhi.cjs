/**
 * Scrapes Jan Aushadhi product list + stores from janaushadhi.gov.in
 * Uses Playwright to intercept the API calls made by the React SPA.
 */
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const path = require('path')

loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const PRODUCT_URL = 'https://janaushadhi.gov.in/productportfolio/ProductmrpList'
const STORE_URL   = 'https://janaushadhi.gov.in/StoreLocation.aspx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sep = trimmed.indexOf('=')
    if (sep <= 0) continue
    const key = trimmed.slice(0, sep).trim()
    let value = trimmed.slice(sep + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function normalizeText(v) {
  if (!v) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

function toTitleCase(v) {
  return v.toLowerCase().split(' ').filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function cleanSaltName(v) {
  if (!v) return null
  let s = normalizeText(v)
  s = s.replace(/\b(?:ip|bp|usp)\b/gi, ' ')
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b(?:\s*[+/]\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b)*/gi, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s ? toTitleCase(s) : null
}

// ── Products ──────────────────────────────────────────────────────────────────

async function scrapeProducts(browser) {
  console.log('\nScraping product list...')
  const page = await browser.newPage()

  const apiData = []

  page.on('response', async (response) => {
    const url = response.url()
    const ct  = response.headers()['content-type'] || ''
    if (!ct.includes('json')) return
    if (!url.includes('janaushadhi') && !url.includes('pmbi')) return
    try {
      const json = await response.json()
      if (Array.isArray(json) && json.length > 0) {
        console.log(`  Intercepted API: ${url} → ${json.length} items`)
        apiData.push(...json)
      } else if (json?.data && Array.isArray(json.data)) {
        console.log(`  Intercepted API: ${url} → ${json.data.length} items`)
        apiData.push(...json.data)
      }
    } catch {}
  })

  await page.goto(PRODUCT_URL, { waitUntil: 'networkidle', timeout: 60000 })

  // Try scrolling to trigger lazy loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(3000)

  // If no API intercepted, fall back to DOM scraping
  if (apiData.length === 0) {
    console.log('  No JSON API intercepted, scraping DOM table...')
    const rows = await page.evaluate(() => {
      const results = []
      const tables = document.querySelectorAll('table')
      for (const table of tables) {
        const headers = [...table.querySelectorAll('th')].map(th => th.innerText.trim().toLowerCase())
        const trs = [...table.querySelectorAll('tbody tr')]
        for (const tr of trs) {
          const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
          if (cells.length > 0) {
            const row = {}
            headers.forEach((h, i) => { row[h] = cells[i] || '' })
            results.push(row)
          }
        }
      }
      return results
    })
    apiData.push(...rows)
  }

  await page.close()
  return apiData
}

// ── Stores ────────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
]

async function scrapeStoresForState(page, state) {
  const stores = []

  // intercept JSON from store API
  const captured = []
  const handler = async (response) => {
    const ct = response.headers()['content-type'] || ''
    if (!ct.includes('json')) return
    try {
      const json = await response.json()
      if (Array.isArray(json)) captured.push(...json)
      else if (json?.data && Array.isArray(json.data)) captured.push(...json.data)
    } catch {}
  }
  page.on('response', handler)

  try {
    await page.goto(STORE_URL, { waitUntil: 'networkidle', timeout: 30000 })

    // Try to fill state dropdown and submit
    const stateSelect = page.locator('select').first()
    if (await stateSelect.count() > 0) {
      await stateSelect.selectOption({ label: state }).catch(() => {})
      const searchBtn = page.locator('button[type=submit], input[type=submit]').first()
      if (await searchBtn.count() > 0) await searchBtn.click()
      await page.waitForTimeout(3000)
    }
  } catch (e) {
    // ignore navigation errors
  }

  page.off('response', handler)

  if (captured.length > 0) return captured

  // fallback: DOM table
  const rows = await page.evaluate(() => {
    const results = []
    const tables = document.querySelectorAll('table')
    for (const table of tables) {
      const headers = [...table.querySelectorAll('th')].map(th => th.innerText.trim().toLowerCase())
      const trs = [...table.querySelectorAll('tbody tr')]
      for (const tr of trs) {
        const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
        if (cells.length > 0) {
          const row = {}
          headers.forEach((h, i) => { row[h] = cells[i] || '' })
          results.push(row)
        }
      }
    }
    return results
  })
  return rows
}

// ── Parse product rows ────────────────────────────────────────────────────────

function parseProduct(raw) {
  // Handle various key names from the API
  const get = (...keys) => {
    for (const k of keys) {
      const val = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()] ?? ''
      if (val && String(val).trim()) return normalizeText(String(val))
    }
    return ''
  }

  const name    = get('ProductName', 'product_name', 'Name', 'medicine', 'Medicine', 'drug name', 'drug')
  const generic = get('GenericName', 'generic_name', 'Generic', 'salt', 'composition', 'Salt', 'SaltName')
  const mrp     = parseFloat(get('MRP', 'mrp', 'Price', 'price', 'Rate', 'rate') || '0') || null
  const packSize = get('PackSize', 'pack_size', 'Pack', 'Packing', 'Unit', 'unit')
  const code    = get('ProductCode', 'product_code', 'Code', 'code', 'DrugCode')

  if (!name && !generic) return null

  return {
    salt_name:          cleanSaltName(generic || name),
    jan_aushadhi_name:  name || null,
    jan_aushadhi_mrp:   mrp,
    jan_aushadhi_code:  code || null,
    who_essential:      false,
  }
}

// ── Parse store rows ──────────────────────────────────────────────────────────

function parseStore(raw) {
  const get = (...keys) => {
    for (const k of keys) {
      const val = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()] ?? ''
      if (val && String(val).trim()) return normalizeText(String(val))
    }
    return ''
  }

  const name    = get('StoreName', 'store_name', 'Name', 'name', 'KendraName', 'kendra_name')
  const address = get('Address', 'address', 'addr')
  const pincode = get('Pincode', 'pincode', 'Pin', 'pin', 'PinCode', 'ZIP')
  const city    = get('City', 'city', 'District', 'district')
  const state   = get('State', 'state', 'StateName')
  const phone   = get('Phone', 'phone', 'Mobile', 'mobile', 'Contact')
  const lat     = parseFloat(get('Lat', 'lat', 'Latitude', 'latitude') || '') || null
  const lng     = parseFloat(get('Lng', 'lng', 'Long', 'longitude', 'Longitude') || '') || null

  if (!name && !pincode) return null

  return {
    name:    name || 'Jan Aushadhi Kendra',
    address: address || null,
    pincode: pincode || '',
    city:    city || null,
    state:   state || null,
    lat,
    lng,
    phone:   phone || null,
  }
}

// ── Upsert helpers ────────────────────────────────────────────────────────────

async function upsertBatch(table, rows, conflictCol) {
  const BATCH = 500
  let total = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol })
    if (error) {
      console.error(`  Upsert error at batch ${Math.floor(i/BATCH)+1}: ${error.message}`)
      continue
    }
    total += batch.length
    process.stdout.write(`\r  Upserted ${total}/${rows.length}`)
  }
  console.log()
  return total
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ── Products
  let productRows = []
  try {
    const raw = await scrapeProducts(browser)
    console.log(`Raw product rows: ${raw.length}`)
    if (raw.length > 0) {
      writeFileSync('data/pmbjp-products-raw.json', JSON.stringify(raw, null, 2))
      console.log('Saved raw to data/pmbjp-products-raw.json')
      console.log('Sample keys:', Object.keys(raw[0]).join(', '))
    }
    productRows = raw.map(parseProduct).filter(Boolean)

    // Dedupe by salt_name
    const seen = new Set()
    productRows = productRows.filter(r => {
      if (!r.salt_name || seen.has(r.salt_name)) return false
      seen.add(r.salt_name)
      return true
    })
    console.log(`Parsed ${productRows.length} unique generic products`)

    if (productRows.length > 0) {
      await upsertBatch('generics', productRows, 'salt_name')
      console.log(`Loaded ${productRows.length} rows into generics table`)

      // Mark medicines with has_generic = true
      const saltNames = productRows.map(r => r.salt_name).filter(Boolean)
      for (const salt of saltNames) {
        await supabase.from('medicines')
          .update({ has_generic: true })
          .ilike('salt_name', salt)
      }
      console.log('Updated has_generic flag on medicines')
    }
  } catch (e) {
    console.error('Product scrape failed:', e.message)
  }

  // ── Stores
  try {
    console.log('\nScraping stores...')
    const storePage = await browser.newPage()
    const allStoreRaw = []

    // Intercept all JSON from store page
    storePage.on('response', async (response) => {
      const ct = response.headers()['content-type'] || ''
      if (!ct.includes('json')) return
      if (!response.url().includes('janaushadhi') && !response.url().includes('pmbi')) return
      try {
        const json = await response.json()
        if (Array.isArray(json) && json.length > 0) {
          console.log(`  Intercepted store API: ${response.url()} → ${json.length} stores`)
          allStoreRaw.push(...json)
        } else if (json?.data && Array.isArray(json.data)) {
          console.log(`  Intercepted store API: ${response.url()} → ${json.data.length} stores`)
          allStoreRaw.push(...json.data)
        }
      } catch {}
    })

    await storePage.goto(STORE_URL, { waitUntil: 'networkidle', timeout: 60000 })
    await storePage.waitForTimeout(5000)
    await storePage.close()

    if (allStoreRaw.length > 0) {
      writeFileSync('data/pmbjp-stores-raw.json', JSON.stringify(allStoreRaw.slice(0, 5), null, 2))
      console.log('Sample store keys:', Object.keys(allStoreRaw[0]).join(', '))

      const storeRows = allStoreRaw.map(parseStore).filter(Boolean)
      console.log(`Parsed ${storeRows.length} stores`)

      if (storeRows.length > 0) {
        await upsertBatch('jan_aushadhi_stores', storeRows, 'id')
        console.log(`Loaded ${storeRows.length} stores into jan_aushadhi_stores`)
      }
    } else {
      console.log('No store data intercepted. The store locator requires state/district selection.')
      console.log('Store data will be scraped in a follow-up step.')
    }
  } catch (e) {
    console.error('Store scrape failed:', e.message)
  }

  await browser.close()
  console.log('\nDone.')
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
