/**
 * Brand alias ingestion — maps 253k brand medicines to their generic salt names.
 * Links each brand to the matching NPPA medicine in the medicines table.
 * Source: github.com/junioralive/Indian-Medicine-Dataset
 */
const { createClient } = require('@supabase/supabase-js')
const { existsSync, readFileSync } = require('fs')
const path = require('path')

loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const CSV_PATH = path.resolve(process.cwd(), 'data/indian-medicines.csv')
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

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const cells = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i], n = line[i + 1]
    if (c === '"') { inQ ? n === '"' ? (cur += '"', i++) : (inQ = false) : (inQ = true); continue }
    if (c === ',' && !inQ) { cells.push(cur); cur = ''; continue }
    cur += c
  }
  cells.push(cur)
  return cells.map(s => s.trim())
}

function loadCsv(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}

// ── Name normalisation ────────────────────────────────────────────────────────

function norm(v) { return (v || '').replace(/\s+/g, ' ').trim() }

function toTitleCase(v) {
  return v.toLowerCase().split(' ').filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function extractSaltFromComposition(comp) {
  if (!comp) return null
  // "Amoxycillin  (500mg) " → "Amoxycillin"
  let s = norm(comp)
  s = s.replace(/\([\d.]+\s*(?:mg|mcg|g|ml|iu|%)[^)]*\)/gi, '')
  s = s.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?|%)\b/gi, '')
  s = s.replace(/\b(?:ip|bp|usp)\b/gi, '')
  s = s.replace(/[/,;|]+/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s ? toTitleCase(s) : null
}

function buildCombinedSalt(comp1, comp2) {
  const s1 = extractSaltFromComposition(comp1)
  const s2 = extractSaltFromComposition(comp2)
  if (s1 && s2) return `${s1} + ${s2}`
  return s1 || s2 || null
}

// Strip strength/form suffix from brand name to get bare brand
function cleanBrandName(name) {
  let n = norm(name)
  // Remove trailing dose strengths: "Augmentin 625", "Dolo 650"
  // Keep these — they help distinguish variants
  return n
}

// ── Load all medicines salt→id index from Supabase ───────────────────────────

async function buildSaltIndex() {
  console.log('Building salt index from medicines table...')
  const saltIndex = new Map() // lowercase salt → medicine id

  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('medicines')
      .select('id, salt_name')
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const m of data) {
      if (m.salt_name) saltIndex.set(m.salt_name.toLowerCase(), m.id)
    }
    if (data.length < PAGE) break
    offset += PAGE
  }

  console.log(`  Indexed ${saltIndex.size} medicine salt names`)
  return saltIndex
}

// ── Match brand to medicine ───────────────────────────────────────────────────

function findMedicineId(saltName, saltIndex) {
  if (!saltName) return null
  const lower = saltName.toLowerCase()

  // Exact match
  if (saltIndex.has(lower)) return saltIndex.get(lower)

  // Try primary component only (for combination drugs)
  const primary = lower.split(/\s*\+\s*/)[0].trim()
  if (primary !== lower && saltIndex.has(primary)) return saltIndex.get(primary)

  // Fuzzy: check if any indexed salt contains the primary word
  const firstWord = primary.split(' ')[0]
  if (firstWord.length >= 5) {
    for (const [indexed, id] of saltIndex) {
      if (indexed.startsWith(firstWord)) return id
    }
  }

  return null
}

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertBatch(rows) {
  const { error } = await supabase
    .from('brand_aliases')
    .upsert(rows, { onConflict: 'brand_name,salt_name' })
  if (error) {
    console.error(`  Upsert error: ${error.message}`)
    return 0
  }
  return rows.length
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Brand Alias Ingestion ===\n')

  const saltIndex = await buildSaltIndex()

  console.log('\nLoading CSV...')
  const rows = loadCsv(CSV_PATH)
  console.log(`  Loaded ${rows.length} rows`)

  // Filter: active allopathy only
  const active = rows.filter(r =>
    r.Is_discontinued !== 'TRUE' && r.type === 'allopathy' && r.name
  )
  console.log(`  Active allopathy: ${active.length}`)

  // Build brand_aliases rows
  const aliases = []
  const seen = new Set() // dedupe (brand_name, salt_name)

  for (const row of active) {
    const brandName = cleanBrandName(row.name)
    if (!brandName || brandName.length < 3) continue

    const saltName = buildCombinedSalt(row.short_composition1, row.short_composition2)
    if (!saltName) continue

    const key = `${brandName.toLowerCase()}||${saltName.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    const medicineId = findMedicineId(saltName, saltIndex)
    const manufacturer = norm(row.manufacturer_name) || null

    aliases.push({ brand_name: brandName, salt_name: saltName, manufacturer, medicine_id: medicineId })
  }

  console.log(`\nUnique brand aliases: ${aliases.length}`)
  const linked = aliases.filter(a => a.medicine_id !== null).length
  console.log(`  Linked to NPPA medicine: ${linked} (${Math.round(linked/aliases.length*100)}%)`)

  // Upsert in batches of 500
  const BATCH = 500
  let total = 0
  for (let i = 0; i < aliases.length; i += BATCH) {
    const batch = aliases.slice(i, i + BATCH)
    const n = await upsertBatch(batch)
    total += n
    process.stdout.write(`\r  Upserted ${total}/${aliases.length}`)
  }
  console.log()

  // Test: search for common brand names
  console.log('\n=== Testing brand lookups ===')
  const testBrands = ['Dolo', 'Crocin', 'Metformin', 'Azithromycin', 'Augmentin', 'Pantoprazole', 'Atorvastatin', 'Paracetamol']
  for (const brand of testBrands) {
    const { data } = await supabase
      .from('brand_aliases')
      .select('brand_name, salt_name, medicine_id')
      .ilike('brand_name', `${brand}%`)
      .limit(1)
    console.log(`  ${brand.padEnd(16)} → ${data?.[0]?.salt_name ?? 'NOT FOUND'} (linked: ${data?.[0]?.medicine_id ? 'yes' : 'no'})`)
  }

  // Summary counts
  const { count: totalAliases } = await supabase
    .from('brand_aliases')
    .select('*', { count: 'exact', head: true })
  const { count: linkedAliases } = await supabase
    .from('brand_aliases')
    .select('*', { count: 'exact', head: true })
    .not('medicine_id', 'is', null)

  console.log(`\n=== Day 5 Summary ===`)
  console.log(`Brand aliases total:   ${totalAliases}`)
  console.log(`Linked to NPPA entry:  ${linkedAliases}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
