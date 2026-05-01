# MedCompare — Data Sources

All data sources used are free, public, or scrapeable. No paid data contracts required.

---

## 1. NPPA Drug Price List (Primary)

**What it is:** National Pharmaceutical Pricing Authority publishes the ceiling prices (maximum retail price) for all scheduled drugs in India. Two schedules:
- **Schedule H**: ~900+ essential medicines with government-mandated price ceilings
- **NLEM (National List of Essential Medicines)**: Core subset of ~400 medicines

**Where to get it:**
- URL: https://nppa.gov.in/drug-price-list
- Format: Excel/PDF download
- Update frequency: Updated when prices are revised (few times/year)
- License: Public government data, free to use

**What to extract:**
```
Medicine Name | Formulation | Pack Size | MRP per unit | Brand Name
```

**Script to run:** `scripts/ingest-nppa.ts`

---

## 2. PMBJP Jan Aushadhi Product List

**What it is:** PM Bharatiya Jan Aushadhi Pariyojana — government scheme for generic medicines. 2,047+ medicines at government-fixed prices (typically 50–90% below market).

**Where to get it:**
- Product catalog: https://janaushadhi.gov.in/ProductList.aspx
- Store locator: https://janaushadhi.gov.in/StoreLocation.aspx
- Format: Web tables (scrapeable) + downloadable Excel
- Update frequency: Quarterly

**What to extract:**
- Product name, pack size, MRP, generic name, product code
- Store: name, pincode, city, state, address, phone

**Key insight:** Jan Aushadhi Paracetamol 500mg (10 tablets) = ₹2.00. Apollo Pharmacy = ₹16.50. This 8x difference is the core of MedCompare's value proposition.

---

## 3. CDSCO Drug Database

**What it is:** Central Drugs Standard Control Organisation — regulatory body that approves all drugs in India. Their database has the definitive brand → salt mapping.

**Where to get it:**
- URL: https://cdscoonline.gov.in/CDSCO/Drugs
- Format: Searchable database (scrapeable, or bulk data available via RTI)
- Update frequency: Continuous (new drug approvals)

**What to extract:**
```
Brand Name | Generic/Salt Name | Manufacturer | Approval Date | Category
```

**Alternative:** Indian Drug Register (indiandrugregister.com) has a compiled, clean version of CDSCO data that's easier to scrape.

---

## 4. Online Pharmacy Prices (Scraped)

Prices are scraped in real-time on user request and cached for 6 hours.

### 1mg (pharmeasy company)
- Base URL: https://www.1mg.com/search/all?name={medicine}
- Method: Playwright headless browser (React-rendered)
- Selectors (as of 2026): `.style__pro-title`, `.style__price-tag`
- Rate limit: 1 req/3s
- Affiliate program: https://www.1mg.com/affiliates (apply for tracking links)

### PharmEasy
- Base URL: https://pharmeasy.in/search/all?name={medicine}
- Method: Playwright
- Similar structure to 1mg (same parent company)
- Rate limit: 1 req/3s

### Apollo Pharmacy
- Base URL: https://www.apollopharmacy.in/search-medicines/{medicine}
- Method: Playwright
- Notes: Needs geo-location for accurate stock/price (default: Delhi)
- Rate limit: 1 req/5s

### Netmeds
- Base URL: https://www.netmeds.com/catalogsearch/result?q={medicine}
- Method: Playwright
- Notes: Cleaner DOM structure, easier to scrape
- Rate limit: 1 req/3s

### MedPlus
- Base URL: https://www.medplusmart.com/searchProduct?search={medicine}
- Method: Playwright
- Notes: Strong South India presence, good generic coverage
- Rate limit: 1 req/5s

---

## 5. WHO Essential Medicines List

**What it is:** WHO's curated list of 550 essential medicines. Cross-referencing with this list helps identify which medicines have well-established generic alternatives globally.

**Where to get it:**
- URL: https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.01
- Format: PDF (parseable)
- Update frequency: Every 2 years

**Use in MedCompare:** Confidence signal — "This medicine is on the WHO Essential Medicines List, meaning its generic is safe and well-established."

---

## 6. ABHA / ABDM Integration (Future)

**What it is:** Ayushman Bharat Digital Mission — India's national health digital infrastructure. Includes:
- ABHA (Ayushman Bharat Health Account) — digital health ID
- Health Records (DigiLocker for medical documents)
- Drug registry integration

**Relevance:** Future feature — allow users to connect their ABHA account to auto-import prescription history → MedCompare auto-shows cheapest options for their regular medicines.

**Sandbox:** https://sandbox.abdm.gov.in (free developer access)

---

## Data Quality Notes

### Medicine Name Normalization
Biggest challenge: the same medicine appears under hundreds of variants.
- "Paracetamol 500mg" = "Paracetamol Tablets IP 500mg" = "Paracetamol 500" = "Crocin 500"
- Solution: normalize all names to `{salt_name} {strength} {form}` canonical form
- Fuzzy matching library: `fuse.js` (covers typos and abbreviations)

### Price Normalization
Pharmacies sell different pack sizes. Must normalize to per-unit price for fair comparison:
- 10-tablet strip at ₹30 = ₹3/tablet
- 15-tablet strip at ₹40 = ₹2.67/tablet
- Show: per-tablet price prominently, pack price secondary

### Scraped Data Freshness
Prices can change without notice (sales, stock changes, price revisions). Policy:
- Show scraped_at timestamp on every price
- If price is > 12 hours old, show stale indicator
- Disclaimer: "Prices are indicative. Verify at pharmacy before purchase."

---

## Data Ingestion Scripts

| Script | Source | Output | Run |
|---|---|---|---|
| `scripts/ingest-nppa.ts` | NPPA Excel | medicines table | One-time + quarterly |
| `scripts/ingest-jan-aushadhi.ts` | PMBJP web | generics + stores | One-time + quarterly |
| `scripts/ingest-cdsco.ts` | CDSCO DB | brand→salt mapping | One-time + quarterly |
| `scripts/scrape-prices.ts` | 5 pharmacies | prices table | Daily cron (top 200) |
| `scripts/update-stores.ts` | PMBJP locator | jan_aushadhi_stores | Monthly |

---

## Legal Considerations

- **Scraping public prices**: Legal in India — prices on public websites are not protected data. Several Indian courts have held that scraping publicly available information for informational/consumer benefit is permissible.
- **Government data (NPPA, CDSCO, PMBJP)**: Public domain. Explicitly open for reuse.
- **Displaying pharmacy prices**: Always link back to source. Include disclaimer that prices may change.
- **Medical advice**: MedCompare shows prices, NOT medical advice. Clear disclaimer on all pages: "Consult your doctor before substituting medicines. This is a price comparison tool, not medical advice."
