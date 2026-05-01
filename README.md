# MedCompare

**Compare medicine prices across every major Indian pharmacy. Find generics that cost 90% less. Instantly.**

India's medicine prices vary 30–50% across pharmacies. Generic equivalents — legally identical molecules — often cost 90% less. Nobody tells you. MedCompare does.

→ **[medcompare.in](https://medcompare.in)** *(coming soon)*

---

## The Problem

- Dolo 650 costs ₹30 at Apollo and ₹6 at a Jan Aushadhi store. Same molecule. Same effect.
- Doctors write brand names. Patients pay brand prices. Generics exist and are government-approved — but nobody explains this.
- 1mg and PharmEasy only compare prices within their own platform. They have zero incentive to send you somewhere cheaper.
- NPPA (the government drug price regulator) publishes all ceiling prices publicly. No one has built a good interface on top of it.

---

## What It Does

1. **Search any medicine** — by brand name ("Dolo 650", "Crocin") or salt name ("Paracetamol")
2. **Compare live prices** across Apollo, 1mg, Netmeds, PharmEasy — all at once
3. **Instantly see the generic alternative** — same salt, fraction of the cost
4. **Find the nearest Jan Aushadhi store** — government generic pharmacy network, 19,000+ locations
5. **NPPA price ceiling** shown on every medicine — know when a pharmacy is overcharging

---

## Data

| Dataset | Size | Source |
|---|---|---|
| NPPA price-capped medicines | 4,346 | Government gazette |
| Brand → generic mappings | 242,166 | Open drug dataset |
| Jan Aushadhi generics | 1,804 | PMBJP API |
| Jan Aushadhi store locations | 19,467 | PMBJP API |
| Pharmacy prices (live scraped) | 4 pharmacies | 1mg, PharmEasy, Apollo, Netmeds |

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/medcompare.git
cd medcompare
npm install
cp .env.example .env.local
# Fill in your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Ingest data

```bash
# NPPA medicine price list (requires data/nppa-formatted.csv)
npm run ingest:nppa -- --file data/nppa-formatted.csv

# Jan Aushadhi generics + 19k store locations
node scripts/ingest-janaushadhi.cjs
node scripts/ingest-stores.cjs

# 242k brand name → generic mappings (requires data/indian-medicines.csv)
node scripts/ingest-brands.cjs

# Scrape live pharmacy prices
npm run scrape:prices               # top 20 medicines
npm run scrape:prices -- --limit 100
npm run scrape:prices -- --pharmacy 1mg --limit 50
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + RLS) |
| Scraping | Playwright (headless Chromium) |
| AI | Google Gemini — prescription OCR |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Search homepage
│   ├── compare/[slug]/       # Price comparison page
│   └── api/
│       ├── search/           # Medicine search API
│       └── scrape/           # On-demand price refresh
├── components/
│   ├── PriceCard.tsx         # Per-pharmacy price row
│   ├── GenericAlert.tsx      # Generic savings callout
│   └── StoreLocator.tsx      # Jan Aushadhi store finder
└── lib/
    ├── scrapers/             # Per-pharmacy scrapers
    │   ├── 1mg.ts
    │   ├── pharmeasy.ts
    │   ├── apollo.ts
    │   └── netmeds.ts
    └── data/
        └── medicines.ts      # DB query layer

scripts/
├── ingest-nppa.cjs           # NPPA price list ingestion
├── ingest-janaushadhi.cjs    # Jan Aushadhi products
├── ingest-stores.cjs         # Jan Aushadhi store locations
├── ingest-brands.cjs         # Brand → generic mapping
└── scrape-prices.cjs         # Batch pharmacy price scraper

supabase/migrations/
├── 001_initial_schema.sql    # medicines, prices, generics, stores
└── 002_brand_aliases.sql     # brand_name → medicine mapping
```

---

## How the Scrapers Work

Each pharmacy scraper uses a confirmed API endpoint or data source (no fragile CSS selectors):

| Pharmacy | Method |
|---|---|
| **1mg** | Intercepts `pwa-dweb-api/api/v4/search/all` — their internal search API |
| **PharmEasy** | Extracts `__NEXT_DATA__.props.pageProps.searchResults[0].salePriceDecimal` |
| **Apollo** | ₹-symbol leaf-node DOM scan after JS hydration |
| **Netmeds** | Intercepts Fynd platform API `/api/service/application/catalog/v3.0/products/{slug}/size` |

---

## Monetization

**Phase 1** — Free. Build trust.  
**Phase 2** — Affiliate referral fees from 1mg, PharmEasy (₹30–80 per completed order).  
**Phase 3** — B2B (corporate health benefits, insurance company API access).

Projected revenue at 100K MAU: ₹15–25 lakh/month from affiliates alone.

---

## Contributing

PRs welcome. Key areas where help is needed:

- [ ] MedPlus scraper
- [ ] Prescription scan UI (Gemini OCR is wired, frontend missing)
- [ ] Price history charts
- [ ] Mobile app (React Native)

---

## License

MIT
