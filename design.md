# MedCompare — Design Brief

## Product context

MedCompare helps Indian users find the cheapest price for any medicine across 4 online pharmacies (Apollo, 1mg, PharmEasy, Netmeds) and surface generic alternatives at Jan Aushadhi government stores that are often 80–90% cheaper.

Core user: someone who just got a prescription, is about to reorder a chronic medication, or is shocked by their pharmacy bill. They are price-sensitive, not tech-enthusiast. Trust matters — this touches healthcare.

Two main surfaces:
1. **Homepage** — search entry point
2. **Compare page** (`/compare/[slug]`) — medicine detail with price table, generic alert, store locator

---

## Current state

The app is functional and wired end-to-end. The design is competent but generic — a standard Tailwind blue-and-white SaaS template. It does not feel like a product with a point of view. Nothing is wrong, but nothing is memorable either.

Specific issues:
- **Hero** reads like every other search tool. Big headline, centered text, blue CTA. Nothing anchors it to India or healthcare.
- **Stats strip** (4,346 medicines / 2,42,166 brands / 19,467 stores) has real power but looks like a data dashboard widget.
- **Features grid** — 4 cards with icon + title + desc. Textbook template. No hierarchy, no surprise.
- **PriceCard** — functional. Color-coded badges, price bar, cheapest highlight. Needs more visual confidence at the price number itself.
- **GenericAlert** — green box with emoji. The most important component on the page (it delivers the money insight) but looks like a success toast, not an insight card.
- **StoreLocator** — plainest component. Blue cards that feel copy-pasted.
- **Typography** — Inter throughout. Functional but no character.
- **Color** — slate/blue/green. Safe. No personality.

---

## Design direction

**Editorial / high-trust utility** — like a well-designed Indian fintech (Zerodha, CRED), not a hospital website. Clean and confident, not sterile. The savings numbers are the star; let them breathe and dominate.

Not dark mode. Light is right for this product — it signals clarity and honesty, which matter in healthcare.

---

## Token system

Define these CSS variables in `globals.css` and use them everywhere. No hardcoded colors in components.

```css
:root {
  /* Backgrounds */
  --bg-base: #F8F9FB;          /* page background — slightly warm off-white */
  --bg-surface: #FFFFFF;
  --bg-subtle: #F1F4F8;        /* input fills, muted sections */

  /* Text */
  --text-primary: #0D1117;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;

  /* Brand */
  --blue: #1D4ED8;             /* primary action, links */
  --blue-light: #EFF6FF;

  /* Savings green — the hero color of this product */
  --green: #047857;
  --green-mid: #059669;
  --green-light: #ECFDF5;
  --green-border: #6EE7B7;

  /* Alert / NPPA ceiling */
  --amber: #D97706;
  --amber-light: #FFFBEB;

  /* Borders */
  --border: #E5E7EB;
  --border-strong: #D1D5DB;

  /* Pharmacy brand colors */
  --pharmacy-1mg:       #E53935;
  --pharmacy-pharmeasy: #F97316;
  --pharmacy-apollo:    #1D4ED8;
  --pharmacy-netmeds:   #0D9488;
  --pharmacy-medplus:   #7C3AED;
}
```

---

## Typography

Add **Plus Jakarta Sans** alongside Inter. Use Plus Jakarta Sans for headings (it has personality without being loud), Inter for body/UI text.

```tsx
// layout.tsx
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['600', '700', '800'],
})
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
```

```css
h1, h2, h3 { font-family: var(--font-heading), sans-serif; }
body        { font-family: var(--font-body), sans-serif; }
```

Scale (use these explicitly, don't rely on Tailwind defaults alone):
- Hero h1: `clamp(2.5rem, 5vw, 4rem)` / weight 800
- Section h2: 1.5rem / weight 700
- Card h3: 1rem / weight 600
- Body: 0.9375rem / weight 400
- Caption/label: 0.8125rem / weight 500

---

## Homepage (`src/app/page.tsx`)

### Hero

Replace centered-text layout with a **split composition** on desktop: left side has the headline and search, right side has a live savings illustration (a simple visual showing ₹850 brand vs ₹89 generic as stacked bars or a comparison card).

On mobile, stacks vertically — headline → search → illustration.

Headline rewrite — be specific, not generic:
```
Stop overpaying
for medicines.

[search bar]
```
Sub-headline: `Compare Apollo, 1mg, PharmEasy, Netmeds — and find generics that cost 90% less.`

The badge (`Free · No signup`) stays — it's doing useful trust work. Make it slightly more distinct: left-align it with the headline rather than center-floating.

Search bar: increase height to 64px, add a subtle inner shadow on focus (not just border color change), placeholder text `"Search by medicine or salt name…"`. The "Compare" button gets `--blue` background with white text, slightly pill-shaped (rounded-xl).

Dropdown suggestions: add a small pharmacy count indicator `"3 pharmacies have prices"` as a right-side detail on each suggestion row where data is available.

### Stats strip

Make numbers land harder. Instead of equal-weight grid, give each stat a different visual treatment — the biggest number gets largest font:

```
₹90%        19,467         4,346
max savings  Jan Aushadhi  NPPA-capped
at generic   stores         medicines
```

Use `tabular-nums`, bold, `--text-primary`. Labels in `--text-muted`.

Background: `--bg-subtle` with no border — let it float between sections naturally.

### Features

Replace the 4-card grid with a **2-column editorial list** on desktop — each feature is a row with a large numeral or icon on the left and text on the right. More hierarchy, less card uniformity.

```
01   Compare online prices
     Apollo, 1mg, PharmEasy, Netmeds side by side.
     Real prices from their websites, not cached data.

02   Find the generic
     Same molecule. Same effect. Jan Aushadhi price vs brand price.
     We show the saving in rupees and percentage, not vague claims.

03   NPPA ceiling check
     Know the government maximum. If a pharmacy charges above it, you'll see.

04   Locate Jan Aushadhi stores
     19,467 government stores. Search by pincode.
```

---

## Compare page (`src/app/compare/[slug]/page.tsx`)

### Medicine header

Current: h1 + grey detail line + NPPA badge.

Improve: add a subtle category chip (e.g. `Cardiovascular` / `Antibiotic` / `Diabetes`) derived from salt classification if available. NPPA ceiling badge should be more visually distinct — amber pill, not grey code block.

```tsx
{medicine.nppa_ceiling && (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full">
    <svg ...shield icon... />
    NPPA ceiling ₹{medicine.nppa_ceiling}
  </span>
)}
```

### GenericAlert — the most important component

This is where the product delivers its core value. It should feel like a revelation, not a notification banner.

Redesign as an **insight card** with three zones:

```
┌─────────────────────────────────────────────────────┐
│  Generic available at Jan Aushadhi                   │
│                                                      │
│   Brand (online cheapest)    Generic (Jan Aushadhi)  │
│   ₹850                →      ₹89                    │
│                                                      │
│   You save ₹761 · 89% cheaper                       │
│   Switch and save ~₹4,566/year                       │
│                                                      │
│  [Find nearest store ↓]   [Share savings]            │
└─────────────────────────────────────────────────────┘
```

- Background: `--green-light`, border: `--green-border`
- The two prices should be large (2rem+), bold, tabular-nums
- Arrow or divider between them reads as "vs"
- Remove the 💡 emoji — the numbers speak
- Keep WhatsApp share — it's a genuine India-specific insight worth sharing

### PriceCard list

Current implementation is solid structurally. Refinements:

- **Pharmacy badge**: use actual pharmacy logo SVGs instead of letter abbreviations (1mg has a recognisable logo mark, Apollo too). If logos aren't available, keep abbr but make the badge 44×44 with rounded-lg, not rounded-xl.
- **Price**: bump to `text-2xl` for cheapest, `text-lg` for others — create more contrast between winner and rest
- **Price bar**: invert the bar logic — cheapest bar should be shortest (showing it's the lowest value), not the longest. Currently `barPct = price / maxPrice` which means the most expensive has the widest bar. Correct to `barPct = minPrice / price * 100` so cheapest gets 100% and most expensive gets a narrower bar — shows relative expensiveness correctly.
- **"Buy →" button**: only show on cheapest row in green. Other rows get a ghost/outline variant to reduce visual noise.

### Section headers

Replace emoji (`🏥 Find Jan Aushadhi...`) with clean typographic headers. Emoji reads as unpolished at this quality level.

### StoreLocator

Pincode input: use the same style as the homepage search bar — consistent design language.

Store cards: replace `bg-blue-50` with `--bg-subtle` border cards. Add a small map pin SVG instead of 📍 emoji. Phone number gets a call icon. Cards should feel like address book entries, not status boxes.

---

## Layout and spacing

Consistent max-widths:
- Page content: `max-w-5xl` (1024px) — already used, keep it
- Compare page content: `max-w-3xl` (768px) — already used, keep it
- Prose/alert text: `max-w-2xl`

Vertical rhythm — use multiples of 8px:
- Section gap: 64px (`py-16`)
- Card padding: 20px (`p-5`)
- Component gap: 24px (`gap-6`)

---

## What NOT to do

- No gradients on backgrounds or hero — keep it flat and clean
- No animation beyond `transition-colors` and the existing spinner — motion for motion's sake is noise here
- No dark mode implementation — adds complexity without benefit for this audience
- No illustration or stock photography — the savings numbers are the visual
- Don't add more pages without finishing these two surfaces first

---

## Implementation order

1. `globals.css` — token system + font import
2. `layout.tsx` — heading font, nav cleanup
3. `GenericAlert.tsx` — most important, highest impact
4. `PriceCard.tsx` — price bar fix (invert logic), price size contrast
5. `page.tsx` (homepage) — stats strip, features section, hero refinements
6. `compare/[slug]/page.tsx` — medicine header, section headers
7. `StoreLocator.tsx` — pincode input style, store card style

Each step should be independently shippable. Don't touch step N+1 until step N is working in the browser.
