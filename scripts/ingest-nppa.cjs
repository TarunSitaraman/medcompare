const { createHash } = require('node:crypto')
const { existsSync, readFileSync } = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

loadEnvFile(path.resolve(process.cwd(), '.env.local'))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const HEADER_ALIASES = {
  medicine: [
    'medicine name',
    'drug name',
    'name of medicine',
    'name',
    'formulation',
    'medicine',
    'scheduled formulation',
    'scheduled drug',
  ],
  brand: ['brand name', 'brand', 'product name'],
  salt: ['salt name', 'generic name', 'drug composition', 'composition', 'active ingredient'],
  manufacturer: ['manufacturer', 'company', 'marketer'],
  category: ['category', 'therapeutic category', 'segment'],
  form: ['form', 'dosage form', 'dosage'],
  strength: ['strength', 'dose', 'dosage strength'],
  packSize: ['pack size', 'packing', 'pack', 'unit pack'],
  price: [
    'mrp per unit',
    'ceiling price',
    'price',
    'ceiling price (rs.)',
    'price to retailer',
    'retail price',
    'ceiling price exclusive of gst',
  ],
}

const FORM_TOKENS = [
  'tablet',
  'tablets',
  'capsule',
  'capsules',
  'syrup',
  'suspension',
  'injection',
  'inj',
  'cream',
  'ointment',
  'gel',
  'drops',
  'drop',
  'inhaler',
  'respules',
  'lotion',
  'solution',
  'powder',
  'kit',
  'vial',
]

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const getArg = (name) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }

  const file = getArg('--file') ?? getArg('-f')
  const updatedAt = getArg('--updated-at') ?? new Date().toISOString()
  const dryRun = args.includes('--dry-run')

  if (!file) {
    console.error('Usage: npm run ingest:nppa -- --file <path-to-nppa.csv|xlsx> [--updated-at 2026-05-01] [--dry-run]')
    process.exit(1)
  }

  return {
    file: path.resolve(process.cwd(), file),
    updatedAt,
    dryRun,
  }
}

function normalizeHeader(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeText(value) {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim()
}

function toTitleCase(value) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parsePrice(value) {
  const cleaned = normalizeText(value).replace(/[,\u20b9]/g, '')
  const match = cleaned.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => normalizeText(cell))
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\ufeff/g, ''))
    .filter((line) => line.trim().length > 0)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

async function parseWorkbook(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.csv') {
    return parseCsv(readFileSync(filePath, 'utf8'))
  }

  if (ext === '.json') {
    const json = JSON.parse(readFileSync(filePath, 'utf8'))
    return json.map((row) => {
      const normalized = {}
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = normalizeText(String(value ?? ''))
      })
      return normalized
    })
  }

  if (ext !== '.xlsx' && ext !== '.xls') {
    throw new Error(`Unsupported file type: ${ext}. Use CSV, JSON, XLSX, or XLS.`)
  }

  let xlsx
  try {
    xlsx = require('xlsx')
  } catch {
    throw new Error('XLSX parsing requires the optional "xlsx" package. Install it with: npm install xlsx')
  }

  const workbook = xlsx.readFile(filePath)
  const rows = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const json = xlsx.utils.sheet_to_json(sheet, { defval: '' })
    json.forEach((row) => {
      const normalized = {}
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = normalizeText(String(value ?? ''))
      })
      rows.push(normalized)
    })
  }

  return rows
}

function getField(row, aliases) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias)
    if (row[normalized]) return normalizeText(row[normalized])
  }
  return ''
}

function extractStrength(value) {
  const match = value.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b(?:\s*[+/]\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b)*/i)
  return match ? normalizeText(match[0]) : null
}

function extractForm(value) {
  const lower = value.toLowerCase()
  const token = FORM_TOKENS.find((item) => new RegExp(`\\b${item}\\b`, 'i').test(lower))
  return token ? toTitleCase(token.replace(/s$/, '')) : null
}

function cleanSaltName(value) {
  let cleaned = normalizeText(value)
  cleaned = cleaned.replace(/\b(?:ip|bp|usp)\b/gi, '')
  cleaned = cleaned.replace(/\([^)]*\)/g, ' ')
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b(?:\s*[+/]\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?)\b)*/gi, ' ')
  FORM_TOKENS.forEach((token) => {
    cleaned = cleaned.replace(new RegExp(`\\b${token}\\b`, 'gi'), ' ')
  })
  cleaned = cleaned.replace(/[/,;-]+/g, ' ')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned ? toTitleCase(cleaned) : null
}

function buildBaseName(row) {
  return (
    getField(row, HEADER_ALIASES.brand) ||
    getField(row, HEADER_ALIASES.medicine) ||
    getField(row, HEADER_ALIASES.salt)
  )
}

function rowHash(row) {
  const sorted = Object.entries(row)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${normalizeText(value)}`)
    .join('|')

  return createHash('sha256').update(sorted).digest('hex')
}

function parseMedicineRow(row, sourceFile, updatedAt) {
  const baseName = normalizeText(buildBaseName(row))
  if (!baseName) return null

  const explicitSalt = getField(row, HEADER_ALIASES.salt)
  const explicitStrength = getField(row, HEADER_ALIASES.strength)
  const explicitForm = getField(row, HEADER_ALIASES.form)
  const packSize = getField(row, HEADER_ALIASES.packSize) || null
  const manufacturer = getField(row, HEADER_ALIASES.manufacturer) || null
  const category = getField(row, HEADER_ALIASES.category) || null
  const price = parsePrice(getField(row, HEADER_ALIASES.price))
  const sourceRowHash = rowHash(row)

  const strength = explicitStrength || extractStrength(baseName) || null
  const form = explicitForm || extractForm(baseName) || null
  const saltName = cleanSaltName(explicitSalt || baseName)

  if (!saltName) return null

  const slugBase = slugify([saltName, strength, form, packSize].filter(Boolean).join(' '))
  if (!slugBase) return null

  return {
    brand_name: baseName,
    salt_name: saltName,
    manufacturer,
    category,
    form,
    strength,
    pack_size: packSize,
    nppa_ceiling: price,
    slug: `${slugBase}-${sourceRowHash.slice(0, 8)}`,
    has_generic: false,
    source: 'nppa',
    source_file: path.basename(sourceFile),
    source_row_hash: sourceRowHash,
    source_updated_at: updatedAt,
  }
}

async function main() {
  const { file, updatedAt, dryRun } = parseArgs()

  if (!existsSync(file)) {
    console.error(`File not found: ${file}`)
    process.exit(1)
  }

  console.log(`Reading NPPA file: ${file}`)
  const rawRows = await parseWorkbook(file)
  console.log(`Loaded ${rawRows.length} raw rows`)

  const parsedRows = rawRows
    .map((row) => parseMedicineRow(row, file, updatedAt))
    .filter(Boolean)

  const dedupedByHash = new Map()
  parsedRows.forEach((row) => {
    dedupedByHash.set(row.source_row_hash, row)
  })
  const finalRows = Array.from(dedupedByHash.values())

  console.log(`Parsed ${parsedRows.length} rows; ${finalRows.length} unique source rows remain after dedupe`)

  if (finalRows.length === 0) {
    console.error('No NPPA rows were parsed. Check the file headers and content shape.')
    process.exit(1)
  }

  if (dryRun) {
    console.log('Dry run only. Sample rows:')
    console.table(finalRows.slice(0, 10))
    return
  }

  const batchSize = 500
  let upserted = 0

  for (let index = 0; index < finalRows.length; index += batchSize) {
    const batch = finalRows.slice(index, index + batchSize)
    const { error } = await supabase
      .from('medicines')
      .upsert(batch, { onConflict: 'slug' })

    if (error) {
      console.error(`Supabase upsert failed at batch ${index / batchSize + 1}: ${error.message}`)
      process.exit(1)
    }

    upserted += batch.length
    console.log(`Upserted ${upserted}/${finalRows.length}`)
  }

  console.log(`Done. Imported ${upserted} NPPA rows into medicines.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
