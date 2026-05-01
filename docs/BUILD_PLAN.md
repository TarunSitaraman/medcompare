# MedCompare — 30-Day Build Plan

## North Star
Ship a working app where a user can type any medicine name and instantly see prices across pharmacies + a cheaper generic alternative. That's the MVP. Everything else is iteration.

---

## Week 1 — Data Foundation (Days 1–7)
**Goal: Know what every medicine costs and what its generic equivalent is.**

### Day 1 — Project Setup
- [ ] `npx create-next-app@latest medcompare --typescript --tailwind --app`
- [ ] Install dependencies: `shadcn/ui`, `playwright`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `zod`
- [ ] Set up Supabase project (free tier) — get connection string
- [ ] Set up Vercel project — connect to GitHub
- [ ] Configure `.env.local` with all keys
- [ ] Push skeleton to GitHub

### Day 2 — Database Schema
- [ ] Design and create `medicines` table (see `src/db/schema.ts`)
- [ ] Design and create `prices` table (pharmacy + price + scraped_at)
- [ ] Design and create `generics` table (brand → generic mapping)
- [ ] Design and create `jan_aushadhi_stores` table (location + pincode)
- [ ] Run migrations on Supabase

### Day 3 — NPPA Data Ingestion
- [ ] Download NPPA Drug Price List (PDF/Excel from nppa.gov.in)
- [ ] Write parser script (`scripts/ingest-nppa.ts`) to extract:
  - Medicine name
  - Salt/generic name
  - Price ceiling (MRP)
  - Pack size
- [ ] Clean and normalize medicine names (handle typos, abbreviations)
- [ ] Load into `medicines` table — target: 800+ medicines with price ceilings

### Day 4 — Jan Aushadhi Data Ingestion
- [ ] Download Jan Aushadhi product list (janaushadhi.gov.in — publicly available Excel)
- [ ] Parse: product name, generic name, MRP, pack size
- [ ] Map Jan Aushadhi products to NPPA medicines by salt name
- [ ] Scrape Jan Aushadhi store locator for store coordinates + pincodes
- [ ] Load stores into `jan_aushadhi_stores` table — target: 12,000+ stores

### Day 5 — Brand → Generic Mapping
- [ ] Download CDSCO approved drug list
- [ ] Build brand → salt name mapping table
- [ ] Handle edge cases: combination drugs (e.g., Augmentin = Amoxicillin + Clavulanate)
- [ ] Write fuzzy search function for medicine name lookup (handle spelling variants)
- [ ] Test with 50 common medicines: Dolo, Crocin, Metformin, Azithromycin, etc.

### Day 6 — First Pharmacy Scraper (1mg)
- [ ] Write Playwright scraper for 1mg.com/medicines
- [ ] Handle: search by name → extract price, pack size, availability
- [ ] Store results in `prices` table with timestamp
- [ ] Add 6-hour cache logic (don't re-scrape if price is fresh)
- [ ] Test: scrape 20 common medicines, verify data accuracy

### Day 7 — More Scrapers + Validation
- [ ] Scraper for PharmEasy (similar structure to 1mg)
- [ ] Scraper for Apollo Pharmacy
- [ ] Scraper for Netmeds
- [ ] Scraper for MedPlus
- [ ] Price normalization: convert all to per-tablet/per-ml unit pricing
- [ ] End of week: can answer "What does Dolo 650 cost across 5 pharmacies?"

---

## Week 2 — Core Product (Days 8–14)
**Goal: Working web app with search + comparison. Show it to 5 people.**

### Day 8 — Search API
- [ ] `GET /api/search?q=dolo` → returns matching medicines with metadata
- [ ] Fuzzy search on medicine name + salt name
- [ ] Include: brand name, generic name, price ceiling, has_generic flag
- [ ] Add debounced autocomplete (250ms delay)
- [ ] Response time target: < 200ms (all from DB, no scraping on search)

### Day 9 — Price Comparison API
- [ ] `GET /api/compare/[medicine-slug]` → triggers scraping if prices are stale
- [ ] Returns: prices array, generic alternative, Jan Aushadhi price, savings calculation
- [ ] Background job: scrape all 5 pharmacies in parallel
- [ ] Cache result in Vercel KV for 6 hours
- [ ] Handle not-found gracefully

### Day 10 — Search UI
- [ ] Landing page: large search box, headline, 3 example searches
- [ ] Autocomplete dropdown: show medicine name + generic name + "generic available" badge
- [ ] Mobile-first design (70% of Indian users are on mobile)
- [ ] Fast: search results appear in under 300ms (debounced, from cache)

### Day 11 — Comparison Results Page
- [ ] `/compare/dolo-650` → full price comparison view
- [ ] Price cards: one per pharmacy, sorted cheapest first
- [ ] Generic alternative box: prominent, shows savings percentage
- [ ] Jan Aushadhi callout: "Find a store near you" → pincode input
- [ ] "Why is this so much cheaper?" expandable explainer

### Day 12 — Jan Aushadhi Store Locator
- [ ] Pincode input → find nearest 3 Jan Aushadhi stores
- [ ] Show: store name, address, distance (approx), phone if available
- [ ] Link to Google Maps directions
- [ ] Fallback: "No store within 5km — order from [cheapest online pharmacy]"

### Day 13 — Savings Calculator
- [ ] Show total annual savings if user switches to generic for their top medicines
- [ ] "You save ₹4,200/year switching Metformin to generic" type of calculation
- [ ] Shareable savings summary (WhatsApp share card)

### Day 14 — End of Week 2 Review
- [ ] Show to 5 real people — observe, don't explain
- [ ] Note every point of confusion
- [ ] Fix top 3 UX problems
- [ ] Deploy to Vercel production URL
- [ ] Share in 1 community (Reddit r/india or a WhatsApp group)

---

## Week 3 — Prescription Scanner + Distribution (Days 15–21)
**Goal: 10x the value with prescription scanning. Start getting real users.**

### Day 15 — Prescription Upload UI
- [ ] Photo upload component (camera + file picker)
- [ ] Drag-and-drop for desktop
- [ ] Preview + crop before submit
- [ ] Loading state with "Reading your prescription..." message

### Day 16 — Prescription OCR with Claude
- [ ] `POST /api/scan-prescription` → accepts image
- [ ] Send to Claude API with vision: "Extract all medicine names from this prescription image"
- [ ] Prompt engineering: handle handwritten prescriptions, various formats
- [ ] Return structured list of medicine names
- [ ] Cost: claude-haiku-4-5 — roughly ₹0.05 per prescription scan

### Day 17 — Bulk Comparison Flow
- [ ] After OCR: show all extracted medicines as cards
- [ ] User confirms/corrects extracted names
- [ ] "Compare all" → runs comparison for entire prescription at once
- [ ] Summary: "Your prescription costs ₹1,840 at Apollo. Generic equivalent: ₹290."
- [ ] Shareable breakdown

### Day 18 — SEO Foundation
- [ ] Dynamic `<title>` and `<description>` for every medicine comparison page
- [ ] Example: "Dolo 650 Price: Compare Apollo, 1mg, MedPlus + Generic Alternative"
- [ ] `sitemap.xml` generator — one URL per medicine in the database
- [ ] `robots.txt` allowing all crawlers
- [ ] Target: every medicine name is a Google-searchable landing page

### Day 19 — WhatsApp Share Flow
- [ ] "Share savings" button on comparison page
- [ ] Generates pre-filled WhatsApp message:
  `"Found this: Metformin 500mg costs ₹180 at Apollo but only ₹22 at Jan Aushadhi. Check MedCompare: [link]"`
- [ ] This is the primary growth loop — people naturally share money-saving discoveries

### Day 20 — Price Alert (Basic)
- [ ] Email signup: "Alert me if [medicine] drops below ₹X"
- [ ] Store in Supabase
- [ ] Cron job (daily): check prices, send email if alert triggered
- [ ] Use Resend (free tier: 100 emails/day) for transactional email

### Day 21 — Affiliate Integration (1mg + PharmEasy)
- [ ] Sign up for 1mg affiliate program (apply at 1mg.com/affiliates)
- [ ] Sign up for PharmEasy affiliate program
- [ ] Replace price links with affiliate deep links
- [ ] Test: clicking "Buy on 1mg" → lands on correct product page with affiliate tracking
- [ ] This is zero extra work for the user, starts generating revenue

---

## Week 4 — Polish, Launch, Distribution (Days 22–30)

### Day 22 — Performance
- [ ] Lighthouse score target: 90+ on mobile
- [ ] All images WebP, lazy loaded
- [ ] First paint < 1.5s on 4G
- [ ] Prefetch comparison data for autocomplete results

### Day 23 — Medicine Database Expansion
- [ ] Expand to top 500 most-searched medicines in India
- [ ] Add: chronic disease medicines (diabetes, hypertension, thyroid — highest repeat purchase)
- [ ] Add: OTC common medicines (paracetamol, antacids, vitamins)
- [ ] Verify all generic mappings are correct

### Day 24 — Error States + Edge Cases
- [ ] Medicine not found → suggest similar medicines
- [ ] Pharmacy website down → show last known price with "Price as of [date]"
- [ ] No generic available → explain why (patented drug, single manufacturer)
- [ ] Scraper blocked → fallback to cached data

### Day 25 — Analytics Setup
- [ ] Add PostHog (free tier) for product analytics
- [ ] Track: search queries, comparison views, generic click-throughs, pharmacy link clicks
- [ ] Build simple dashboard: top searched medicines, savings generated total
- [ ] Public "savings counter": "MedCompare users have saved ₹X so far" (social proof)

### Day 26 — Launch Assets
- [ ] Write Product Hunt launch copy
- [ ] Create 3 demo screenshots (search → results → savings)
- [ ] Record 60-second demo video (Loom)
- [ ] Write Reddit r/india + r/personalfinanceindia post
- [ ] Prepare LinkedIn post (tag Razorpay Fix My Itch for distribution)

### Day 27 — Pre-launch Seeding
- [ ] Share in 5 WhatsApp groups (family + friends + professional)
- [ ] Post in: r/india, r/personalfinanceindia, r/bangalore (or your city)
- [ ] DM 10 people directly with a personalized "check this out" message
- [ ] Goal: 100 real users before Product Hunt launch

### Day 28 — Product Hunt Launch
- [ ] Submit to Product Hunt (Tuesday–Thursday for best results)
- [ ] Ask for honest feedback, not just upvotes
- [ ] Monitor and respond to every comment within 1 hour

### Day 29 — Post-launch Iteration
- [ ] Fix top 3 issues reported by real users
- [ ] Add most-requested missing medicines
- [ ] Thank early users personally

### Day 30 — Review + Next Sprint Planning
- [ ] Metrics review: users, searches, savings generated, affiliate clicks
- [ ] User interview: call 3 active users, 15-minute conversation
- [ ] Define Sprint 2 priorities based on real data

---

## Post-MVP Roadmap (Month 2+)

### High Impact
- **Hindi + regional language UI** — massive reach expansion
- **Voice search** — "Paracetamol ka sasta brand kaunsa hai?"
- **Chrome extension** — price comparison overlay on pharmacy websites
- **Doctor partnership** — "Print this generic prescription" feature for doctors

### Distribution Plays
- **ABHA integration** — Ayushman Bharat Health Account (government digital health ID)
- **Corporate tie-ups** — pitch to HR teams at 50 companies
- **Jan Aushadhi partnership** — official data partnership with PMBJP

### Revenue Expansion
- **API product** — let hospitals/clinics embed price comparison in their billing
- **Insurance integration** — show patient their insured medicines vs OOP cost
- **B2B dashboard** — corporate health managers see employee medicine spend patterns

---

## Key Metrics to Track Weekly

| Metric | Week 1 Target | Month 1 Target | Month 3 Target |
|---|---|---|---|
| Medicines in DB | 500 | 1,000 | 5,000 |
| Daily searches | 0 | 100 | 1,000 |
| Monthly users | 0 | 500 | 10,000 |
| Affiliate clicks | 0 | 50 | 500 |
| Avg savings shown | — | ₹200/session | ₹400/session |
| Revenue | ₹0 | ₹0 | ₹5,000/month |
