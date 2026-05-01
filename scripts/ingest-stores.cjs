/**
 * Jan Aushadhi store ingestion — direct API call to getAllKendraByStateDistrict
 * Also fixes has_generic flag on medicines table.
 */
const { createClient } = require('@supabase/supabase-js')
const { existsSync, readFileSync } = require('fs')
const path = require('path')

loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const BASE = 'https://janaushadhi.gov.in:8443'
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

const HEADERS_BASE = {
  Accept: 'application/json',
  Referer: 'https://janaushadhi.gov.in/',
  Origin: 'https://janaushadhi.gov.in',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
}

async function getToken() {
  const res = await fetch(`${BASE}/auth/generateGuestToken`, {
    headers: HEADERS_BASE,
  })
  const json = await res.json()
  return json.responseBody
}

async function apiPost(endpoint, body, token) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      ...HEADERS_BASE,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${endpoint}`)
  return res.json()
}

async function getAllStates(token) {
  const res = await fetch(`${BASE}/api/kendra/getAllStateOfIndia`, {
    headers: { ...HEADERS_BASE, Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  return json.data ?? []
}

function parseStore(raw) {
  const pincode = raw.pinCode != null ? String(raw.pinCode) : ''
  const name = (raw.contactPerson || raw.storeCode || 'Jan Aushadhi Kendra').trim()
  const address = (raw.kendraAddress || '').trim() || null
  const city = (raw.districtName || '').trim() || null
  const state = (raw.stateName || '').trim() || null
  const lat = parseFloat(raw.latitude) || null
  const lng = parseFloat(raw.longitude) || null
  const phone = (raw.contactNumber || '').trim() || null

  return { name, address, pincode, city, state, lat, lng, phone }
}

async function upsertBatch(table, rows, conflictCol) {
  const BATCH = 500
  let total = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol })
    if (error) {
      console.error(`\n  Upsert error batch ${Math.floor(i / BATCH) + 1}: ${error.message}`)
      if (i === 0) console.error('  Sample:', JSON.stringify(batch[0]))
      continue
    }
    total += batch.length
    process.stdout.write(`\r  Upserted ${total}/${rows.length}`)
  }
  console.log()
  return total
}

async function loadStores() {
  console.log('=== Jan Aushadhi Store Ingestion ===\n')

  const PAGE_SIZE = 500
  let token = await getToken()

  // Probe total count
  const probe = await apiPost(
    '/api/v1/admin/addKendra/getAllKendraByStateDistrict',
    { pageIndex: 0, pageSize: PAGE_SIZE, stateId: 0, districtId: 0, pinCode: 0, storeCode: '' },
    token,
  )
  const total = probe?.responseBody?.totalElement ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  console.log(`Total stores: ${total}, pages: ${totalPages} (pageSize ${PAGE_SIZE})`)

  const allStores = [...(probe?.responseBody?.addKendraResponseList ?? [])]
  console.log(`Page 1/${totalPages} — ${allStores.length} stores`)

  for (let page = 1; page < totalPages; page++) {
    token = await getToken()
    try {
      const data = await apiPost(
        '/api/v1/admin/addKendra/getAllKendraByStateDistrict',
        { pageIndex: page, pageSize: PAGE_SIZE, stateId: 0, districtId: 0, pinCode: 0, storeCode: '' },
        token,
      )
      const list = data?.responseBody?.addKendraResponseList ?? []
      allStores.push(...list)
      process.stdout.write(`\r  Page ${page + 1}/${totalPages} — ${allStores.length}/${total} stores`)
    } catch (e) {
      console.error(`\n  Error on page ${page + 1}: ${e.message}`)
    }
  }

  console.log(`\n\nTotal stores fetched: ${allStores.length}`)

  const parsed = allStores.map(parseStore).filter(s => s.name && s.pincode)
  console.log(`Parsed: ${parsed.length} stores`)

  console.log('Inserting into jan_aushadhi_stores...')
  await upsertBatch('jan_aushadhi_stores', parsed, 'id')
  console.log(`Done. ${parsed.length} stores loaded.`)
}

async function fixHasGeneric() {
  console.log('\n=== Fixing has_generic flag ===')

  // Get all unique salt names from generics table
  const { data: generics } = await supabase
    .from('generics')
    .select('salt_name')
    .not('salt_name', 'is', null)

  if (!generics?.length) {
    console.log('No generics found.')
    return
  }

  console.log(`Checking ${generics.length} generic salt names against medicines...`)

  // Build a set of normalised words from generic salt names
  // Then do a single bulk update using a more permissive match
  let marked = 0
  for (const g of generics) {
    if (!g.salt_name) continue
    // Extract the primary active ingredient (first word or two) for broad matching
    const primaryWord = g.salt_name.split(' ')[0]
    if (primaryWord.length < 4) continue

    const { error, count } = await supabase
      .from('medicines')
      .update({ has_generic: true })
      .ilike('salt_name', `%${primaryWord}%`)
      .select('id', { count: 'exact', head: true })

    if (error) {
      // ignore individual errors
    } else {
      marked += count ?? 0
    }
  }

  console.log(`Marked ${marked} medicine entries with has_generic = true`)
}

async function main() {
  await loadStores()
  await fixHasGeneric()

  // Summary
  const { count: storeCount } = await supabase
    .from('jan_aushadhi_stores')
    .select('*', { count: 'exact', head: true })
  const { count: genericCount } = await supabase
    .from('generics')
    .select('*', { count: 'exact', head: true })
  const { count: medWithGeneric } = await supabase
    .from('medicines')
    .select('*', { count: 'exact', head: true })
    .eq('has_generic', true)

  console.log('\n=== Day 4 Summary ===')
  console.log(`Generics in DB:          ${genericCount}`)
  console.log(`Stores in DB:            ${storeCount}`)
  console.log(`Medicines with generic:  ${medWithGeneric}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
