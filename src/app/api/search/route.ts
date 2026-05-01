import { NextRequest, NextResponse } from 'next/server'
import { searchMedicines, logSearch } from '@/lib/data/medicines'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchMedicines(query)
    await logSearch(query, results.length > 0, results[0]?.id)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 })
  }
}
