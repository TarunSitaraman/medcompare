/**
 * Jan Aushadhi data ingestion — calls the janaushadhi.gov.in:8443 API directly.
 * Flow: guest token → products → stores → upsert into Supabase
 */
const { createClient } = require('@supabase/supabase-js')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const path = require('path')

loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const BASE = 'https://janaushadhi.gov.in:8443'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
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

// ── API helpers ───────────────────────────────────────────────────────────────

async function getGuestToken() {
  const res = await fetch(`${BASE}/auth/generateGuestToken`, {
    headers: { 'Accept': 'application/json' },
  })
  const json = await res.json()
  const token = json.responseBody
  if (!token) throw new Error('Failed to get guest token: ' + JSON.stringify(json))
  return token
}

async function apiPost(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`)
  return res.json()
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`)
  return res.json()
}

// ── Normalise helpers ─────────────────────────────────────────────────────────

function norm(v) {
  if (!v) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

function toTitleCase(v) {
  return v.toLowerCase().split(' ').filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function cleanSalt(v) {
  if (!v) return null
  let s = norm(v)
  s = s.replace(/\b(?:ip|bp|usp)\b/gi, ' ')
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b(?:\s*[+/]\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b)*/gi, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s ? toTitleCase(s) : null
}

// ── Fetch all products ────────────────────────────────────────────────────────

async function fetchAllProducts(token) {
  console.log('Fetching products (single bulk call)...')
  const data = await apiPost('/api/v1/admin/product/getAllProductForWeb', {
    pageIndex:  0,
    pageSize:   1000000,
    searchText: '',
    orderBy:    'asc',
    columnName: 'drug_code',
  }, token)

  let list = data?.responseBody?.newProductResponsesList ?? data?.responseBody ?? []
  if (!Array.isArray(list)) list = []
  console.log(`  Fetched ${list.length} products`)
  return list
}

// ── Fetch all stores ──────────────────────────────────────────────────────────

const STORE_ENDPOINTS = [
  '/api/v1/admin/addKendra/getAllKendraForWeb',
  '/api/v1/admin/kendra/getAllKendra',
  '/api/kendra/getAllKendra',
  '/api/v1/kendra/getAll',
  '/api/v1/admin/addKendra/getKendraList',
]

async function fetchAllStores(token) {
  console.log('\nFetching stores via Playwright (requires state-by-state interaction)...')
  const { chromium } = require('playwright')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const allStores = []
  let storeEndpoint = null

  // Intercept all JSON responses from the :8443 API
  page.on('response', async (res) => {
    const url = res.url()
    if (!url.includes(':8443')) return
    if (url.includes('generateGuestToken') || url.includes('count') || url.includes('Visited')) return
    try {
      const json = await res.json()
      // Detect store API endpoint from first successful response
      const items = json?.responseBody?.kendraResponseList
        ?? json?.responseBody?.storeList
        ?? json?.responseBody
      if (Array.isArray(items) && items.length > 0 && items[0].pinCode !== undefined) {
        if (!storeEndpoint) {
          storeEndpoint = url
          console.log(`\n  Store endpoint found: ${url}`)
          console.log('  Sample store keys:', Object.keys(items[0]).slice(0, 10).join(', '))
        }
        allStores.push(...items)
        process.stdout.write(`\r  Stores collected: ${allStores.length}`)
      }
    } catch {}
  })

  await page.goto('https://janaushadhi.gov.in/locate-kendra', { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(3000)

  // Find state dropdown and iterate all states
  const stateOptions = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')]
    for (const sel of selects) {
      const opts = [...sel.options].filter(o => o.value && o.value !== '0' && o.value !== '')
      if (opts.length > 5) return opts.map(o => ({ value: o.value, text: o.text.trim() }))
    }
    return []
  })

  if (stateOptions.length === 0) {
    console.log('\n  No state dropdown found on locate-kendra page, trying /StoreLocation.aspx...')
    await page.goto('https://janaushadhi.gov.in/StoreLocation.aspx', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
  } else {
    console.log(`\n  Found ${stateOptions.length} states in dropdown`)
    for (const state of stateOptions) {
      try {
        const sel = page.locator('select').first()
        await sel.selectOption(state.value)
        await page.waitForTimeout(1000)
        const searchBtn = page.locator('button[type=submit], button:has-text("Search"), input[type=submit]').first()
        if (await searchBtn.count() > 0) {
          await searchBtn.click()
          await page.waitForTimeout(2000)
        }
        process.stdout.write(`\r  State: ${state.text.padEnd(30)} | stores: ${allStores.length}`)
      } catch {}
    }
  }

  await page.waitForTimeout(3000)
  await browser.close()
  console.log(`\n  Total raw stores collected: ${allStores.length}`)
  return allStores
}

// ── Parse ─────────────────────────────────────────────────────────────────────

function parseProduct(raw) {
  const name    = norm(raw.genericName ?? raw.productName ?? raw.name ?? '')
  const mrp     = parseFloat(raw.mrp ?? raw.MRP ?? raw.price ?? 0) || null
  const packSize = norm(raw.unitSize ?? raw.packSize ?? raw.pack ?? '')
  const code    = raw.drugCode != null ? String(raw.drugCode) : null
  const group   = norm(raw.groupName ?? raw.category ?? '')

  if (!name) return null

  return {
    salt_name:          cleanSalt(name),
    jan_aushadhi_name:  name,
    jan_aushadhi_mrp:   mrp,
    jan_aushadhi_code:  code,
    who_essential:      false,
  }
}

function parseStore(raw) {
  const name    = norm(raw.storeName ?? raw.kendraName ?? raw.name ?? raw.kendra_name ?? '')
  const address = norm(raw.address ?? raw.Address ?? raw.location ?? '')
  const pincode = norm(raw.pinCode ?? raw.pincode ?? raw.pin ?? raw.zip ?? '')
  const city    = norm(raw.city ?? raw.City ?? raw.district ?? raw.District ?? '')
  const state   = norm(raw.state ?? raw.State ?? raw.stateName ?? '')
  const phone   = norm(raw.phone ?? raw.Phone ?? raw.mobile ?? raw.contact ?? '')
  const lat     = parseFloat(raw.latitude ?? raw.lat ?? 0) || null
  const lng     = parseFloat(raw.longitude ?? raw.lng ?? raw.long ?? 0) || null

  if (!name && !pincode) return null

  return {
    name:    name || 'Jan Aushadhi Kendra',
    address: address || null,
    pincode: pincode || '',
    city:    city || null,
    state:   state || null,
    lat:     lat,
    lng:     lng,
    phone:   phone || null,
  }
}

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertBatch(table, rows, conflictCol) {
  const BATCH = 500
  let total = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol })
    if (error) {
      console.error(`\n  Upsert error (batch ${Math.floor(i/BATCH)+1}): ${error.message}`)
      // Log sample row on first error
      if (i === 0) console.error('  Sample row:', JSON.stringify(batch[0]))
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
  console.log('Getting guest token...')
  const token = await getGuestToken()
  console.log('  Token obtained.')

  // ── Products
  const rawProducts = await fetchAllProducts(token)
  console.log(`\nRaw products fetched: ${rawProducts.length}`)

  if (rawProducts.length > 0) {
    writeFileSync('data/pmbjp-products-raw.json', JSON.stringify(rawProducts.slice(0, 10), null, 2))
    console.log('Sample product keys:', Object.keys(rawProducts[0]).join(', '))
    console.log('Sample product:', JSON.stringify(rawProducts[0]))

    const parsed = rawProducts.map(parseProduct).filter(r => r?.salt_name)
    const deduped = [...new Map(parsed.map(r => [r.salt_name, r])).values()]
    console.log(`Parsed: ${parsed.length}, unique by salt: ${deduped.length}`)

    if (deduped.length > 0) {
      console.log('Inserting into generics table...')
      await upsertBatch('generics', deduped, 'salt_name')
      console.log(`Inserted ${deduped.length} generics`)

      // Mark has_generic on matching medicines
      console.log('Marking has_generic on medicines...')
      let marked = 0
      for (const g of deduped) {
        const { count } = await supabase.from('medicines')
          .update({ has_generic: true })
          .ilike('salt_name', `%${g.salt_name}%`)
          .select('id', { count: 'exact', head: true })
        marked += count ?? 0
      }
      console.log(`  Marked ${marked} medicine rows with has_generic = true`)
    }
  }

  // ── Stores
  const freshToken2 = await getGuestToken()
  const rawStores = await fetchAllStores(freshToken2)
  console.log(`Raw stores fetched: ${rawStores.length}`)

  if (rawStores.length > 0) {
    writeFileSync('data/pmbjp-stores-raw.json', JSON.stringify(rawStores.slice(0, 5), null, 2))
    console.log('Sample store keys:', Object.keys(rawStores[0]).join(', '))

    const parsedStores = rawStores.map(parseStore).filter(Boolean)
    console.log(`Parsed ${parsedStores.length} stores`)
    console.log('Inserting into jan_aushadhi_stores...')
    await upsertBatch('jan_aushadhi_stores', parsedStores, 'id')
    console.log(`Inserted ${parsedStores.length} stores`)
  } else {
    console.log('No stores returned — the store endpoint may need state/district params.')
    console.log('Check data/pmbjp-products-raw.json for the API shape, then re-run.')
  }

  console.log('\nDay 4 complete.')
}

main().catch(err => {
  console.error('\nFatal:', err.message)
  process.exit(1)
})
