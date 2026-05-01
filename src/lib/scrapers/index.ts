import { scrape1mg } from './1mg'
import { scrapePharmEasy } from './pharmeasy'
import { scrapeApollo } from './apollo'
import { scrapeNetmeds } from './netmeds'
import { supabaseAdmin } from '../supabase'

export type ScrapeResult = {
  pharmacy: string
  price: number | null
  pricePerUnit: number | null
  url: string | null
  inStock: boolean
  scrapedAt: Date
}

const SCRAPERS: Record<string, (name: string, strength?: string) => Promise<ScrapeResult>> = {
  '1mg': scrape1mg,
  pharmeasy: scrapePharmEasy,
  apollo: scrapeApollo,
  netmeds: scrapeNetmeds,
}

export async function scrapeAllPharmacies(
  medicineName: string,
  strength?: string
): Promise<ScrapeResult[]> {
  const results = await Promise.allSettled(
    Object.values(SCRAPERS).map(scraper => scraper(medicineName, strength))
  )
  return results
    .filter((r): r is PromiseFulfilledResult<ScrapeResult> => r.status === 'fulfilled')
    .map(r => r.value)
}

export async function scrapeAndPersist(
  medicineId: string,
  medicineName: string,
  strength?: string
): Promise<ScrapeResult[]> {
  const results = await scrapeAllPharmacies(medicineName, strength)
  const db = supabaseAdmin()

  const rows = results.map(r => ({
    medicine_id: medicineId,
    pharmacy: r.pharmacy,
    price: r.price,
    price_per_unit: r.pricePerUnit,
    url: r.url,
    in_stock: r.inStock,
    scraped_at: r.scrapedAt.toISOString(),
  }))

  if (rows.length > 0) {
    const { error } = await db
      .from('prices')
      .upsert(rows, { onConflict: 'medicine_id,pharmacy' })
    if (error) console.error('Persist error:', error.message)
  }

  return results
}
