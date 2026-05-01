# MedCompare — Monetization Strategy

## Core Principle

**MedCompare is free for users. Always.**

The product only works if users trust it completely. Any hint that results are influenced by money kills that trust. Revenue comes from actions users were going to take anyway (buying medicine online) — MedCompare just gets a referral fee for sending them there.

---

## Phase 1: Affiliate Revenue (Month 1–6)

### How it works
When a user clicks "Buy on 1mg" or "Buy on PharmEasy" from MedCompare, we attach an affiliate tracking code to the URL. When they complete a purchase, we earn a commission.

### Rates (approximate, 2026)
| Pharmacy | Commission | Notes |
|---|---|---|
| 1mg | 4–7% of order value | Higher for generics |
| PharmEasy | 3–6% | Similar to 1mg (same parent) |
| Netmeds | 3–5% | Reliance-owned, stable |
| Apollo | 2–4% | Lower but high conversion |
| MedPlus | 2–3% | Regional, lower volume |

### Revenue model
At 10,000 monthly users with avg 15% conversion to purchase:
- 1,500 purchases/month × avg order value ₹400 × 4% commission = **₹24,000/month**

At 100,000 monthly users: **₹2.4 lakh/month**

### How to apply
- 1mg Affiliate: https://www.1mg.com/affiliates (sign up, get approved in 3–5 days)
- PharmEasy: Similar affiliate portal
- Netmeds: Part of Reliance affiliate program

### Implementation
- Wrap all "Buy" buttons in affiliate deep links
- Track clicks in PostHog for optimization
- A/B test button placement and copy

---

## Phase 2: Premium Features (Month 6–12)

### Price Alerts Pro (₹99/month)
Free tier: 3 price alerts
Pro tier: Unlimited alerts + WhatsApp notifications (not just email) + weekly price report for your regular medicines

### Prescription Vault (₹149/month)
Store prescriptions digitally, auto-re-order regular medicines when due, track which medicines you've saved money on over time

### Family Plan (₹249/month)
Manage medicines for the whole family — parents, kids, chronic conditions. The segment that needs this most (urban professionals managing aging parents) is willing to pay for convenience.

---

## Phase 3: B2B Revenue (Month 12+)

### Corporate Health Programs
Companies with 500+ employees spend ₹2,000–5,000 per employee annually on OTC medicines through reimbursement. A corporate dashboard that shows employees the cheapest options for their reimbursable medicines can save companies 30–40%.

**Pricing:** ₹200–500/employee/year  
**Target customers:** IT companies, manufacturing, large enterprises  
**Sales channel:** HR conferences, LinkedIn outreach, health insurance broker referrals

**Revenue at 10 companies × 500 employees:** ₹10 lakh–25 lakh/year

### Hospital & Clinic Integration
Hospitals can embed a "cheapest pharmacy for this prescription" widget in their patient-facing apps. Patients see where to fill their prescription for the best price before leaving the hospital.

**Pricing:** ₹50,000–2 lakh/year per hospital  
**Target:** Private hospitals with patient apps, telemedicine platforms

### Insurance Integration
Health insurers want their policyholders to use generics (lower claims). An integration where the insurance app shows "Use generic = your out-of-pocket drops by 80%" directly reduces claims.

**Pricing:** Revenue share on savings demonstrated, or flat API licensing fee  
**Target:** Niva Bupa, Star Health, Bajaj Allianz (all have digital-first initiatives)

### API Product
White-label the price comparison engine. Any health platform can embed medicine price comparison via a simple API call.

**Pricing:** ₹5,000–25,000/month based on query volume  
**Target:** Telemedicine platforms, EMR vendors, hospital chains

---

## Revenue Projection

| Timeline | Monthly Revenue | Driver |
|---|---|---|
| Month 1–3 | ₹0 | Building user base |
| Month 3–6 | ₹5,000–20,000 | Affiliate early traction |
| Month 6–12 | ₹25,000–1,00,000 | Affiliates + first premium users |
| Year 2 | ₹2–5 lakh/month | B2B + affiliate scale |
| Year 3 | ₹10–25 lakh/month | B2B contracts + API product |

---

## What NOT to Do

### Never take money to influence rankings
If Apollo pays us to show them first, we lose the trust that is the entire product. Zero compromise here.

### Never sell user data
Prescription data is sensitive. We don't store it (process and discard) and never sell it.

### Never show "sponsored" results in the comparison
The comparison table is always ordered by price, cheapest first. No exceptions.

### Never charge for basic search
The core utility — "what does this medicine cost?" — must always be free. That's the promise.

---

## The Growth Loop That Makes This Work

```
User saves money on medicine
    → Tells 3 friends about it (naturally — people share savings)
    → 3 friends use MedCompare
    → 3 × 0.15 buy through affiliate link
    → ₹18 affiliate revenue per referred user
    → Total LTV of one referral chain: ₹18 × multiplier
```

The product markets itself. Saving someone ₹500 on medicine is one of the most shareable experiences in personal finance.
