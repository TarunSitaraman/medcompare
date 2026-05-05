import Fuse from 'fuse.js'
import { supabase, type Medicine, type Price, type Generic, type Store } from '../supabase'

export type SearchResult = Medicine & {
  display_name: string
  matched_brand: string | null
  clean_salt: string
  min_price: number | null
}

function cleanSaltName(salt: string): string {
  const parts = salt
    .split(/\s*\+\s*/)
    .map(p => p.replace(/\s+(manufactured|marketed|m\s*\/?s|by)\b.*/i, '').trim())
    .filter(Boolean)
  const joined = parts.slice(0, 2).join(' + ') + (parts.length > 2 ? ' +…' : '')
  return joined.length > 60 ? joined.slice(0, 57) + '…' : joined
}

export async function searchMedicines(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []

  const [directResult, aliasResult] = await Promise.all([
    supabase
      .from('medicines')
      .select('*')
      .or(`brand_name.ilike.%${query}%,salt_name.ilike.%${query}%`)
      .limit(10),
    supabase
      .from('brand_aliases')
      .select('medicine_id, brand_name')
      .ilike('brand_name', `${query}%`)
      .not('medicine_id', 'is', null)
      .limit(10),
  ])

  if (directResult.error) throw directResult.error

  // medicine_id → matched brand alias name
  const aliasMap = new Map<string, string>()
  for (const a of aliasResult.data ?? []) {
    if (a.medicine_id && !aliasMap.has(a.medicine_id)) {
      aliasMap.set(a.medicine_id, a.brand_name)
    }
  }

  const medicines = new Map<string, SearchResult>()

  for (const m of directResult.data ?? []) {
    const brand = aliasMap.get(m.id) ?? null
    medicines.set(m.id, {
      ...m,
      display_name: brand ?? cleanSaltName(m.salt_name),
      matched_brand: brand,
      clean_salt: cleanSaltName(m.salt_name),
      min_price: null,
    })
  }

  const aliasIds = [...aliasMap.keys()].filter(id => !medicines.has(id))
  if (aliasIds.length > 0) {
    const { data: linked } = await supabase
      .from('medicines')
      .select('*')
      .in('id', aliasIds)
    for (const m of linked ?? []) {
      medicines.set(m.id, {
        ...m,
        display_name: aliasMap.get(m.id) ?? m.salt_name,
        matched_brand: aliasMap.get(m.id) ?? null,
        clean_salt: cleanSaltName(m.salt_name),
        min_price: null,
      })
    }
  }

  const combined = Array.from(medicines.values())
  if (!combined.length) return []

  const fuse = new Fuse(combined, {
    keys: ['display_name', 'salt_name'],
    threshold: 0.4,
    distance: 100,
  })

  const ranked = fuse.search(query).map(r => r.item)

  // Fetch min prices for all matched medicines in one query
  const ids = ranked.map(r => r.id)
  const { data: priceRows } = await supabase
    .from('prices')
    .select('medicine_id, price')
    .in('medicine_id', ids)
    .eq('in_stock', true)

  const minPriceMap = new Map<string, number>()
  for (const row of priceRows ?? []) {
    const cur = minPriceMap.get(row.medicine_id)
    if (cur === undefined || row.price < cur) minPriceMap.set(row.medicine_id, row.price)
  }

  const withPrices = ranked.map(r => ({ ...r, min_price: minPriceMap.get(r.id) ?? null }))
  // Priced medicines first, then unpriced
  withPrices.sort((a, b) => {
    if (a.min_price !== null && b.min_price === null) return -1
    if (a.min_price === null && b.min_price !== null) return 1
    return 0
  })
  return withPrices
}

export async function getMedicineBySlug(slug: string): Promise<Medicine | null> {
  const { data, error } = await supabase
    .from('medicines')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export async function getPricesForMedicine(medicineId: string): Promise<Price[]> {
  const { data, error } = await supabase
    .from('prices')
    .select('*')
    .eq('medicine_id', medicineId)
    .eq('in_stock', true)
    .order('price', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getPricesForMedicines(ids: string[]): Promise<Price[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('prices')
    .select('*')
    .in('medicine_id', ids)
    .eq('in_stock', true)
    .order('price', { ascending: true })
  if (error) throw error
  return data ?? []
}

function extractIngredients(saltName: string): string[] {
  return saltName
    .split(/\s*\+\s*/)
    .map(p =>
      p
        .replace(/\s+(manufactured|marketed|m\s*\/?s|by)\b.*/i, '')
        .replace(/\s+\d[\d.]*\s*(?:mg|mcg|iu|g|ml|%)\b.*/i, '')
        .trim()
    )
    .filter(Boolean)
}

export async function getGenericForSalt(saltName: string): Promise<Generic | null> {
  const ingredients = extractIngredients(saltName)
  if (!ingredients.length) return null

  // Fetch generics matching the primary ingredient
  const { data } = await supabase
    .from('generics')
    .select('*')
    .ilike('salt_name', `%${ingredients[0]}%`)
    .limit(20)

  if (!data?.length) return null

  // Score each candidate by how many ingredients appear in its salt_name
  const lower = (s: string) => s.toLowerCase()
  const scored = data.map(g => ({
    g,
    score: ingredients.filter(ing => lower(g.salt_name).includes(lower(ing))).length,
  }))
  scored.sort((a, b) => b.score - a.score)

  return scored[0].score > 0 ? scored[0].g : null
}

export async function getNearestStores(pincode: string, limit = 5): Promise<Store[]> {
  // Search by exact pincode first, then expand to nearby (same first 3 digits)
  const prefix = pincode.substring(0, 3)

  const { data, error } = await supabase
    .from('jan_aushadhi_stores')
    .select('*')
    .like('pincode', `${prefix}%`)
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function logSearch(query: string, matched: boolean, medicineId?: string) {
  await supabase.from('search_logs').insert({
    query: query.toLowerCase().trim(),
    matched,
    medicine_id: medicineId ?? null,
  })
}

export function calculateSavings(
  brandPrice: number,
  genericPrice: number
): { amount: number; percentage: number; annualSavings: number } {
  const amount = brandPrice - genericPrice
  const percentage = Math.round((amount / brandPrice) * 100)
  // Assume average medicine taken for 6 months/year, 30 days/pack
  const annualSavings = Math.round(amount * 6)
  return { amount, percentage, annualSavings }
}

export function buildAffiliateUrl(pharmacy: string, baseUrl: string): string {
  const ids: Record<string, string> = {
    '1mg': process.env.AFFILIATE_1MG_ID ?? '',
    pharmeasy: process.env.AFFILIATE_PHARMEASY_ID ?? '',
    netmeds: process.env.AFFILIATE_NETMEDS_ID ?? '',
    apollo: process.env.AFFILIATE_APOLLO_ID ?? '',
  }

  const affiliateId = ids[pharmacy]
  if (!affiliateId) return baseUrl

  const url = new URL(baseUrl)
  url.searchParams.set('ref', affiliateId)
  return url.toString()
}
