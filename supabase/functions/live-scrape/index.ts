import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

async function scrape1mg(name: string, strength?: string): Promise<{ price: number | null; url: string | null; inStock: boolean }> {
  const q = strength ? `${name} ${strength}` : name
  try {
    const res = await fetch(
      `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}&filter=true&type=medicine`,
      { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' } }
    )
    const html = await res.text()
    // Extract __NEXT_DATA__ or embedded JSON
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (match) {
      const json = JSON.parse(match[1])
      const products = json?.props?.pageProps?.searchData?.products ?? []
      const p = products[0]
      if (p) {
        const price = parsePrice(p.discounted_price ?? p.price)
        return { price, url: p.url ? `https://www.1mg.com${p.url}` : null, inStock: price !== null }
      }
    }
  } catch { /* fallthrough */ }
  return { price: null, url: null, inStock: false }
}

async function scrapePharmeasy(name: string, strength?: string): Promise<{ price: number | null; url: string | null; inStock: boolean }> {
  const q = strength ? `${name} ${strength}` : name
  try {
    const res = await fetch(
      `https://pharmeasy.in/search/all?name=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' } }
    )
    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (match) {
      const json = JSON.parse(match[1])
      const results = json?.props?.pageProps?.searchResults ?? []
      const p = results.find((r: Record<string, unknown>) => r.type !== 'OTC_DEVICE') ?? results[0]
      if (p) {
        const price = parsePrice(p.salePriceDecimal ?? p.assuredDiscountPrice ?? p.mrpDecimal)
        const slug = p.slug ?? p.urlSlug ?? ''
        return {
          price: price && price > 0 ? price : null,
          url: slug ? `https://pharmeasy.in/online-pharmacy/medicines/${slug}` : null,
          inStock: price !== null,
        }
      }
    }
  } catch { /* fallthrough */ }
  return { price: null, url: null, inStock: false }
}

async function scrapeNetmeds(name: string, strength?: string): Promise<{ price: number | null; url: string | null; inStock: boolean }> {
  const q = strength ? `${name} ${strength}` : name
  try {
    const res = await fetch(
      `https://www.netmeds.com/catalogsearch/result?q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' } }
    )
    const html = await res.text()
    // Netmeds embeds prices in data attributes
    const priceMatch = html.match(/data-price="([\d.]+)"/)
    const urlMatch = html.match(/href="(https:\/\/www\.netmeds\.com\/prescriptions\/[^"]+)"/)
    const price = priceMatch ? parsePrice(priceMatch[1]) : null
    return { price, url: urlMatch?.[1] ?? null, inStock: price !== null }
  } catch { /* fallthrough */ }
  return { price: null, url: null, inStock: false }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { medicine_id, slug, name, strength } = await req.json()
    if (!medicine_id || !name) {
      return new Response(JSON.stringify({ error: 'medicine_id and name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Run all three scrapers in parallel
    const [r1mg, rpharmeasy, rnetmeds] = await Promise.all([
      scrape1mg(name, strength),
      scrapePharmeasy(name, strength),
      scrapeNetmeds(name, strength),
    ])

    const now = new Date().toISOString()
    const rows = [
      { medicine_id, pharmacy: '1mg', ...r1mg, scraped_at: now, slug },
      { medicine_id, pharmacy: 'pharmeasy', ...rpharmeasy, scraped_at: now, slug },
      { medicine_id, pharmacy: 'netmeds', ...rnetmeds, scraped_at: now, slug },
    ].filter(r => r.price !== null)

    if (rows.length > 0) {
      await supabase.from('prices').upsert(rows, { onConflict: 'medicine_id,pharmacy' })
    }

    // Mark any queue entry done
    await supabase.from('scrape_queue').update({ status: 'done' }).eq('medicine_id', medicine_id)

    return new Response(JSON.stringify({ ok: true, updated: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
