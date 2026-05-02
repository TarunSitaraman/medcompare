/**
 * Drains the scrape_queue table — run this manually or via cron.
 * Usage: node scripts/drain-queue.cjs
 */
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { runScrapers } = require('./scrape-prices.cjs')

async function main() {
  const { data: queue, error } = await supabase
    .from('scrape_queue')
    .select('id, medicine_id, slug')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(20)

  if (error) { console.error('Queue error:', error.message); process.exit(1) }
  if (!queue?.length) { console.log('Queue empty.'); return }

  console.log(`Processing ${queue.length} queued medicines...`)

  for (const item of queue) {
    await supabase.from('scrape_queue').update({ status: 'processing' }).eq('id', item.id)

    const { data: med } = await supabase.from('medicines').select('*').eq('id', item.medicine_id).single()
    if (!med) { await supabase.from('scrape_queue').update({ status: 'failed', processed_at: new Date().toISOString() }).eq('id', item.id); continue }

    try {
      const browser = await chromium.launch({ headless: true })
      // Reuse scrape logic from scrape-prices
      const { scrapeMedicine } = require('./scrape-prices.cjs')
      const prices = await scrapeMedicine(browser, med)
      await browser.close()

      if (prices.length > 0) {
        await supabase.from('prices').upsert(prices, { onConflict: 'medicine_id,pharmacy' })
        console.log(`  ✓ ${med.salt_name} — ${prices.length} prices`)
      }

      await supabase.from('scrape_queue').update({ status: 'done', processed_at: new Date().toISOString() }).eq('id', item.id)
    } catch (e) {
      console.error(`  ✗ ${med.salt_name}:`, e.message)
      await supabase.from('scrape_queue').update({ status: 'failed', processed_at: new Date().toISOString() }).eq('id', item.id)
    }
  }

  console.log('Done.')
}

main().catch(console.error)
