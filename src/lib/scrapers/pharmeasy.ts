import { chromium } from 'playwright'
import type { ScrapeResult } from './index'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

interface PEProduct {
  slug?: string
  urlSlug?: string
  salePriceDecimal?: number
  mrpDecimal?: number
  assuredDiscountPrice?: number
  name?: string
  type?: string
}

function bestPrice(p: PEProduct): number | null {
  const sale = p.salePriceDecimal ?? p.assuredDiscountPrice ?? p.mrpDecimal ?? null
  return sale && sale > 0 ? sale : null
}

function productUrl(p: PEProduct): string | null {
  const slug = p.slug ?? p.urlSlug
  return slug ? `https://pharmeasy.in/online-pharmacy/medicines/${slug}` : null
}

export async function scrapePharmEasy(medicineName: string, strength?: string): Promise<ScrapeResult> {
  const q = strength ? `${medicineName} ${strength}` : medicineName
  const searchUrl = `https://pharmeasy.in/search/all?name=${encodeURIComponent(q)}`
  const empty: ScrapeResult = { pharmacy: 'pharmeasy', price: null, pricePerUnit: null, url: null, inStock: false, scrapedAt: new Date() }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  })
  const page = await ctx.newPage()

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 25000 })

    // Extract from __NEXT_DATA__ — confirmed path: props.pageProps.searchResults
    const products = await page.evaluate((): PEProduct[] => {
      const el = document.getElementById('__NEXT_DATA__')
      if (!el) return []
      try {
        const data = JSON.parse(el.textContent ?? '')
        return data?.props?.pageProps?.searchResults ?? []
      } catch {
        return []
      }
    })

    const first = products.find(p => p.type !== 'OTC_DEVICE') ?? products[0]
    if (!first) return empty

    const price = bestPrice(first)
    return {
      pharmacy: 'pharmeasy',
      price,
      pricePerUnit: null,
      url: productUrl(first),
      inStock: price !== null,
      scrapedAt: new Date(),
    }
  } catch {
    return empty
  } finally {
    await browser.close()
  }
}
