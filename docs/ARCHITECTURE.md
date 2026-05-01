# MedCompare — System Architecture

## Overview

MedCompare is a Next.js application that aggregates medicine prices from multiple Indian pharmacy websites, maps brand-name drugs to their generic equivalents, and helps users find the cheapest option — including government Jan Aushadhi stores.

```
User Request
    │
    ▼
┌─────────────────┐
│   Next.js App   │  (Vercel Edge Network)
│  (App Router)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────────┐
│ Pages │  │  API Routes  │
│  SSR  │  │  (Serverless)│
└───┬───┘  └──────┬───────┘
    │              │
    ▼              ▼
┌──────────────────────────┐
│       Supabase DB        │
│  medicines | prices      │
│  generics | stores       │
└──────────┬───────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐  ┌──────────────┐
│  Cache │  │   Scrapers   │
│Vercel  │  │ (Playwright) │
│   KV   │  │  Background  │
└────────┘  └──────┬───────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌───────┐  ┌───────┐  ┌───────┐
    │  1mg  │  │Apollo │  │Netmeds│
    └───────┘  └───────┘  └───────┘
```

---

## Database Schema

### `medicines` table
```sql
CREATE TABLE medicines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name    TEXT NOT NULL,
  salt_name     TEXT NOT NULL,           -- generic/chemical name
  manufacturer  TEXT,
  category      TEXT,                    -- antibiotic, analgesic, etc.
  form          TEXT,                    -- tablet, syrup, injection
  strength      TEXT,                    -- 500mg, 10ml, etc.
  pack_size     TEXT,                    -- 10 tablets, 60ml, etc.
  nppa_ceiling  DECIMAL(10,2),           -- government max price
  slug          TEXT UNIQUE NOT NULL,    -- URL-friendly: dolo-650
  has_generic   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_medicines_brand ON medicines (brand_name);
CREATE INDEX idx_medicines_salt  ON medicines (salt_name);
CREATE INDEX idx_medicines_slug  ON medicines (slug);
```

### `prices` table
```sql
CREATE TABLE prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id   UUID REFERENCES medicines(id) ON DELETE CASCADE,
  pharmacy      TEXT NOT NULL,           -- '1mg' | 'apollo' | 'netmeds' | 'pharmeasy' | 'medplus'
  price         DECIMAL(10,2) NOT NULL,  -- INR
  url           TEXT,                    -- direct product URL
  in_stock      BOOLEAN DEFAULT TRUE,
  scraped_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(medicine_id, pharmacy)          -- one price per pharmacy per medicine
);

CREATE INDEX idx_prices_medicine ON prices (medicine_id);
CREATE INDEX idx_prices_scraped  ON prices (scraped_at);
```

### `generics` table
```sql
CREATE TABLE generics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salt_name         TEXT NOT NULL,
  jan_aushadhi_name TEXT,               -- name in Jan Aushadhi catalog
  jan_aushadhi_mrp  DECIMAL(10,2),      -- government generic price
  jan_aushadhi_code TEXT,               -- product code in PMBJP catalog
  UNIQUE(salt_name)
);
```

### `jan_aushadhi_stores` table
```sql
CREATE TABLE jan_aushadhi_stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  pincode     TEXT NOT NULL,
  city        TEXT,
  state       TEXT,
  lat         DECIMAL(10, 6),
  lng         DECIMAL(10, 6),
  phone       TEXT
);

CREATE INDEX idx_stores_pincode ON jan_aushadhi_stores (pincode);
CREATE INDEX idx_stores_city    ON jan_aushadhi_stores (city);
```

### `price_alerts` table
```sql
CREATE TABLE price_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  medicine_id   UUID REFERENCES medicines(id),
  pharmacy      TEXT,                   -- NULL = any pharmacy
  target_price  DECIMAL(10,2) NOT NULL,
  triggered     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## API Routes

### Search
```
GET /api/search?q={query}
```
- Queries `medicines` table with fuzzy match on `brand_name` and `salt_name`
- Returns top 10 matches with: id, brand_name, salt_name, has_generic, slug
- Cached: 24 hours (medicine names don't change)
- Response time target: < 100ms

### Compare
```
GET /api/compare/{slug}
```
Flow:
1. Lookup medicine in DB by slug
2. Check Vercel KV cache for fresh prices (< 6 hours old)
3. If stale: trigger background scraping for all 5 pharmacies in parallel
4. Return: medicine details + price array + generic info + savings calculation
- Response time target: < 500ms (from cache), < 8s (fresh scrape)

### Prescription Scan
```
POST /api/scan-prescription
Body: { image: base64 }
```
Flow:
1. Receive image (max 5MB)
2. Send to Claude API with vision prompt
3. Parse response → list of medicine names
4. For each medicine: fuzzy match to DB → return IDs
5. Return: [{ original_text, matched_medicine, confidence }]
- Cost: ~₹0.05 per scan (claude-haiku-4-5)

### Jan Aushadhi Stores
```
GET /api/stores?pincode={pincode}
```
- Lookup stores by pincode + adjacent pincodes (±1 in each position)
- Returns nearest 5 stores with distance estimate
- Cached: 30 days (stores don't move often)

### Price Alert
```
POST /api/alerts
Body: { email, medicine_id, pharmacy?, target_price }
```
- Validate email
- Store in `price_alerts` table
- Send confirmation email via Resend

---

## Scraping Architecture

### Scraper Design
Each pharmacy scraper is a function that takes a medicine name and returns a price:

```typescript
interface ScrapeResult {
  pharmacy: PharmacyName
  price: number | null
  url: string | null
  inStock: boolean
  scrapedAt: Date
}

type Scraper = (medicineName: string) => Promise<ScrapeResult>
```

### Scrapers
| Pharmacy | Method | Notes |
|---|---|---|
| 1mg | Playwright + CSS selectors | Heavy JS, needs headless browser |
| PharmEasy | Playwright | Similar structure to 1mg |
| Apollo | Playwright | React app, need to wait for hydration |
| Netmeds | Playwright | Simpler DOM structure |
| MedPlus | Playwright | Regional chain, good generic coverage |

### Anti-scraping Mitigation
- Random 1–3s delay between requests
- Rotate user-agent strings
- Use residential proxy if blocked (Bright Data has free tier)
- Fallback to last cached price if scraper fails
- Never scrape more than 1 req/sec per pharmacy

### Scraping Schedule
- **On-demand**: When user searches a medicine with stale prices
- **Background cron** (daily at 2 AM): Re-scrape top 200 most-searched medicines
- **Stale threshold**: 6 hours for online pharmacies, 24 hours for Jan Aushadhi

---

## AI Integration (Claude)

### Prescription OCR Prompt
```
You are a medical prescription reader. Extract all medicine names from this prescription image.

Rules:
- Return ONLY medicine names, nothing else
- Include dosage/strength if written (e.g., "Metformin 500mg")
- Handle handwritten text as best you can
- If a medicine name is unclear, include your best guess with low confidence
- Return as JSON array: [{ name: string, confidence: "high" | "medium" | "low" }]
```

### Generic Matching Prompt (fallback when DB lookup fails)
```
Given this brand-name medicine: "{brand_name}"
What is the generic name (active salt/molecule)?
Return only the generic name, nothing else.
```

---

## Caching Strategy

| Data | Cache Location | TTL | Rationale |
|---|---|---|---|
| Search results | Vercel KV | 24h | Medicine names stable |
| Price comparison | Vercel KV | 6h | Prices change infrequently |
| Jan Aushadhi stores | Vercel KV | 30d | Stores stable |
| Prescription OCR | None | — | User data, never cache |
| DB medicine data | In-memory (Next.js) | Per deploy | Static at build time for top 500 |

---

## SEO Architecture

### Static Generation
Top 500 medicines are statically generated at build time:
```typescript
export async function generateStaticParams() {
  const medicines = await getTop500Medicines()
  return medicines.map(m => ({ slug: m.slug }))
}
```

### Dynamic Pages
All other medicine comparison pages are server-rendered on demand.

### Page Title Pattern
`{Brand Name} Price in India | Compare {N} Pharmacies | MedCompare`

### Meta Description Pattern  
`{Brand Name} ({Salt Name}) costs ₹{min_price}–₹{max_price}. Generic alternative costs ₹{generic_price}. Compare prices at Apollo, 1mg, Netmeds, PharmEasy instantly.`

This gives every medicine page a unique, keyword-rich, accurate description that updates automatically.

---

## Security Considerations

- Rate limiting on all API routes: 30 req/min per IP (via Vercel middleware)
- Image upload: max 5MB, validate MIME type, don't store user prescriptions (process + discard)
- No auth required for search/compare (public utility)
- Email for alerts: validate format, send confirmation, double-opt-in
- Environment variables: all API keys in Vercel env, never in code
- HTTPS only (Vercel handles this)
- No PII stored beyond email for alerts (with user consent)

---

## Deployment

### Environments
- **Development**: `localhost:3000` + local Supabase
- **Preview**: Vercel preview URL per PR branch
- **Production**: `medcompare.in` (or similar) on Vercel

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
RESEND_API_KEY=
AFFILIATE_1MG_ID=
AFFILIATE_PHARMEASY_ID=
```

### CI/CD
- Push to `main` → auto-deploy to production
- Push to feature branch → preview deployment
- No manual deployment steps
