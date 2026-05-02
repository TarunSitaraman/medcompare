import { chromium } from 'playwright'
import type { ScrapeResult } from './index'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parseRupees(s: unknown): number | null {
  if (!s) return null
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

export async function scrape1mg(medicineName: string, strength?: string): Promise<ScrapeResult> {
  const q = strength ? `${medicineName} ${strength}` : medicineName
  const searchUrl = `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}&filter=true&type=medicine`
  const empty: ScrapeResult = { pharmacy: '1mg', price: null, pricePerUnit: null, url: null, inStock: false, scrapedAt: new Date() }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  })
  const page = await ctx.newPage()

  // Resolved from debug: 1mg calls pwa-dweb-api/api/v4/search/all with product results
  // Response shape: { data: { search_results: [{ prices: { mrp, discounted_price }, url, available }] } }
  let searchResult: Record<string, unknown> | null = null

  page.on('response', async res => {
    if (!res.url().includes('pwa-dweb-api') || !res.url().includes('search/all')) return
    try {
      const json = await res.json()
      const results: unknown[] = json?.data?.search_results ?? []
      if (results.length > 0) searchResult = results[0] as Record<string, unknown>
    } catch {}
  })

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(1500)

    const hit = searchResult as Record<string, unknown> | null
    if (hit) {
      const prices = hit.prices as Record<string, unknown> | null
      const price =
        parseRupees(prices?.discounted_price) ??
        parseRupees(prices?.mrp)
      const slug = hit.url as string | undefined
      return {
        pharmacy: '1mg',
        price,
        pricePerUnit: null,
        url: slug ? `https://www.1mg.com${slug}` : null,
        inStock: (hit.available as boolean) !== false,
        scrapedAt: new Date(),
      }
    }

    // Fallback: DOM price scan
    const priceText = await page.evaluate(() => {
      const els = document.querySelectorAll('span, b, p')
      for (const el of els) {
        const t = (el.textContent ?? '').trim()
        if (/^₹\s*\d+(\.\d+)?$/.test(t) && (el as HTMLElement).children.length === 0) return t
      }
      return null
    })

    const price = parseRupees(priceText)
    const url = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/drugs/"]') as HTMLAnchorElement | null
      return a?.href ?? null
    })

    return { pharmacy: '1mg', price, pricePerUnit: null, url, inStock: price !== null, scrapedAt: new Date() }
  } catch {
    return empty
  } finally {
    await browser.close()
  }
}
