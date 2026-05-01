import { chromium } from 'playwright'
import type { ScrapeResult } from './index'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function extractProduct(json: unknown): { price: number; url: string; inStock: boolean } | null {
  try {
    const j = json as Record<string, unknown>
    // Apollo API shapes
    const list: unknown[] =
      (j as any)?.data?.products?.items ??
      (j as any)?.data?.products ??
      (j as any)?.products?.items ??
      (j as any)?.products ??
      (j as any)?.items ??
      []

    if (!Array.isArray(list) || list.length === 0) return null

    const p = list[0] as Record<string, unknown>
    const rawPrice =
      (p as any)?.price_range?.minimum_price?.final_price?.value ??
      (p as any)?.special_price ??
      (p as any)?.price ??
      (p as any)?.selling_price

    if (!rawPrice) return null

    const price = parseFloat(String(rawPrice))
    if (isNaN(price) || price <= 0) return null

    const slug = (p as any)?.url_key ?? (p as any)?.url ?? ''
    const url = slug ? `https://www.apollopharmacy.in/${slug}` : ''
    const inStock = (p as any)?.stock_status === 'IN_STOCK' || (p as any)?.in_stock !== false

    return { price, url, inStock }
  } catch {
    return null
  }
}

export async function scrapeApollo(medicineName: string, strength?: string): Promise<ScrapeResult> {
  const query = strength ? `${medicineName} ${strength}` : medicineName
  const searchUrl = `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(query)}`
  const empty: ScrapeResult = { pharmacy: 'apollo', price: null, pricePerUnit: null, url: null, inStock: false, scrapedAt: new Date() }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: 28.6139, longitude: 77.209 },
    permissions: ['geolocation'],
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  })
  const page = await ctx.newPage()

  const intercepted: unknown[] = []
  page.on('response', async res => {
    const url = res.url()
    if (!url.includes('apollopharmacy')) return
    if (!(res.headers()['content-type'] ?? '').includes('json')) return
    try { intercepted.push(await res.json()) } catch {}
  })

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(3000)

    // Strategy 1: intercepted API (Apollo uses GraphQL / REST)
    for (const json of intercepted) {
      const p = extractProduct(json)
      if (p) return { pharmacy: 'apollo', price: p.price, pricePerUnit: null, url: p.url || null, inStock: p.inStock, scrapedAt: new Date() }
    }

    // Strategy 2: window.__APOLLO_STATE__ or similar
    const storeData = await page.evaluate(() => {
      const w = window as any
      return w.__APOLLO_STATE__ ?? w.__PRELOADED_STATE__ ?? w.__INITIAL_STATE__ ?? null
    })
    if (storeData) {
      const p = extractProduct(storeData)
      if (p) return { pharmacy: 'apollo', price: p.price, pricePerUnit: null, url: p.url || null, inStock: p.inStock, scrapedAt: new Date() }
    }

    // Strategy 3: DOM
    const priceText = await page.evaluate(() => {
      const selectors = [
        '[class*="ProductCard_price"]',
        '[class*="Price_price"]',
        '[class*="productPrice"]',
        '[data-testid*="price"]',
        '[class*="discountedPrice"]',
      ]
      for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el?.textContent?.trim()) return el.textContent.trim()
      }
      const all = document.querySelectorAll('span, p, div')
      for (const el of all) {
        const t = el.textContent?.trim() ?? ''
        if (/^₹\s*\d+/.test(t) && el.children.length === 0) return t
      }
      return null
    })

    const productUrl = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/otc/"], a[href*="/medicine/"], a[href*="-bp-"]') as HTMLAnchorElement | null
      return a?.href ?? null
    })

    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null
    return {
      pharmacy: 'apollo',
      price: price && !isNaN(price) ? price : null,
      pricePerUnit: null,
      url: productUrl,
      inStock: price !== null,
      scrapedAt: new Date(),
    }
  } catch {
    return empty
  } finally {
    await browser.close()
  }
}
