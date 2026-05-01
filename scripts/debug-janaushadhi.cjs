/**
 * Debug script: capture all network requests + screenshot from Jan Aushadhi site
 */
const { chromium } = require('playwright')
const { writeFileSync } = require('fs')

async function main() {
  const browser = await chromium.launch({ headless: false }) // visible so we can see it
  const page = await browser.newPage()

  const allRequests = []

  page.on('request', req => {
    if (!req.url().includes('google') && !req.url().includes('font')) {
      allRequests.push({ method: req.method(), url: req.url() })
    }
  })

  page.on('response', async res => {
    const url = res.url()
    if (url.includes('google') || url.includes('font')) return
    const ct = res.headers()['content-type'] || ''
    if (ct.includes('json')) {
      try {
        const body = await res.text()
        if (body.length > 10 && body.length < 5000000) {
          console.log(`JSON response [${res.status()}]: ${url}`)
          console.log('  Preview:', body.slice(0, 200))
        }
      } catch {}
    }
  })

  console.log('Navigating to product list...')
  await page.goto('https://janaushadhi.gov.in/productportfolio/ProductmrpList', {
    waitUntil: 'networkidle', timeout: 60000
  })
  await page.waitForTimeout(5000)

  // Screenshot
  await page.screenshot({ path: 'data/pmbjp-screenshot.png', fullPage: false })
  console.log('Screenshot saved to data/pmbjp-screenshot.png')

  // Get visible text
  const text = await page.evaluate(() => document.body.innerText)
  console.log('\nPage text (first 800 chars):\n', text.slice(0, 800))

  // Look for any data tables
  const tableCount = await page.evaluate(() => document.querySelectorAll('table').length)
  const rowCount = await page.evaluate(() => document.querySelectorAll('tr').length)
  console.log(`\nTables: ${tableCount}, Rows: ${rowCount}`)

  // Check for any list items or cards with medicine data
  const items = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[class*="product"], [class*="medicine"], [class*="drug"], [class*="item"], [class*="row"], li')]
    return all.slice(0, 5).map(el => el.innerText.trim().slice(0, 100))
  })
  console.log('\nSample items:', items)

  writeFileSync('data/all-requests.json', JSON.stringify(allRequests, null, 2))
  console.log(`\nTotal non-google requests: ${allRequests.length}`)
  allRequests.forEach(r => console.log(`  ${r.method} ${r.url}`))

  await browser.close()
}

main().catch(console.error)
