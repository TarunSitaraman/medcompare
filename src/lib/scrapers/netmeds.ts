import { chromium } from 'playwright'
import type { ScrapeResult } from './index'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parsePrice(s: unknown): number | null {
  if (!s) return null
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

export async function scrapeNetmeds(medicineName: string, strength?: string): Promise<ScrapeResult> {
  const q = strength ? `${medicineName} ${strength}` : medicineName
  // Confirmed correct search URL from debug
  const searchUrl = `https://www.netmeds.com/products?q=${encodeURIComponent(q)}`
  const empty: ScrapeResult = { pharmacy: 'netmeds', price: null, pricePerUnit: null, url: null, inStock: false, scrapedAt: new Date() }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  })
  const page = await ctx.newPage()

  // Intercept Fynd catalog price calls: /api/service/application/catalog/v3.0/products/{slug}/size*
  // Response: { items: [{ price: { effective, marked }, price_per_piece: { effective, marked } }] }
  const priceHits: Array<{ price: number; slug: string }> = []

  page.on('response', async res => {
    const u = res.url()
    if (!u.includes('netmeds') && !u.includes('netmeds.tech')) return
    if (!(res.headers()['content-type'] ?? '').includes('json')) return
    if (!u.includes('/catalog/') && !u.includes('/products/') && !u.includes('/items')) return
    try {
      const json = await res.json()
      const items: unknown[] = json?.items ?? []
      for (const raw of items) {
        const item = raw as Record<string, unknown>
        const price =
          parsePrice((item as any)?.price?.effective) ??
          parsePrice((item as any)?.price_per_piece?.effective)
        if (price) {
          // Extract slug from URL: .../products/{slug}/size...
          const m = u.match(/\/products\/([^/]+)\//)
          const slug = m?.[1] ?? ''
          priceHits.push({ price, slug })
          return
        }
      }
    } catch {}
  })

  try {
    // Navigate to homepage first to establish session/cookies
    await page.goto('https://www.netmeds.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1000)

    // Now navigate to search results (correct URL format)
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })

    // Wait for products to render (up to 8s)
    await page.waitForFunction(
      () => document.querySelectorAll('[class*="product"], [class*="medicine"], a[href*="/prescriptions/"], a[href*="/non-prescriptions/"]').length > 0,
      { timeout: 8000 }
    ).catch(() => null)

    await page.waitForTimeout(2000)

    // Use intercepted Fynd price API if available
    if (priceHits.length > 0) {
      const { price, slug } = priceHits[0]
      const url = slug
        ? `https://www.netmeds.com/prescriptions/${slug}`
        : null
      return { pharmacy: 'netmeds', price, pricePerUnit: null, url, inStock: true, scrapedAt: new Date() }
    }

    // DOM scan — Fynd renders ₹ prices after hydration
    const result = await page.evaluate((): { price: string | null; url: string | null } => {
      // Find product cards
      const links = [...document.querySelectorAll('a[href*="/prescriptions/"], a[href*="/non-prescriptions/"]')] as HTMLAnchorElement[]
      const productUrl = links[0]?.href ?? null

      // Find price
      const all = [...document.querySelectorAll('span, p, div')]
      for (const el of all) {
        const t = (el as HTMLElement).textContent?.trim() ?? ''
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && (el as HTMLElement).children.length === 0) {
          return { price: t, url: productUrl }
        }
      }
      return { price: null, url: productUrl }
    })

    const price = parsePrice(result.price)
    return {
      pharmacy: 'netmeds',
      price,
      pricePerUnit: null,
      url: result.url,
      inStock: price !== null,
      scrapedAt: new Date(),
    }
  } catch {
    return empty
  } finally {
    await browser.close()
  }
}
