import { NextRequest, NextResponse } from 'next/server'
import { getMedicineBySlug } from '@/lib/data/medicines'
import { scrapeAndPersist } from '@/lib/scrapers'

// This route is called in the background when prices are stale
// Vercel: set maxDuration = 60s in vercel.json for this route
export async function POST(req: NextRequest) {
  const { slug } = await req.json()

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  const medicine = await getMedicineBySlug(slug)
  if (!medicine) {
    return NextResponse.json({ error: 'medicine not found' }, { status: 404 })
  }

  const results = await scrapeAndPersist(
    medicine.id,
    medicine.brand_name,
    medicine.strength ?? undefined
  )

  return NextResponse.json({ scraped: results.length, slug })
}
