import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getMedicineBySlug,
  getPricesForMedicine,
  getGenericForSalt,
  getNearestStores,
  calculateSavings,
  buildAffiliateUrl,
} from '@/lib/data/medicines'
import PriceCard from '@/components/PriceCard'
import GenericAlert from '@/components/GenericAlert'
import StoreLocator from '@/components/StoreLocator'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ pincode?: string; brand?: string }>
}

function cleanIngredient(s: string): string {
  return s.replace(/\s+(manufactured|marketed|m\/s|by)\b.*/i, '').trim()
}

function getHeading(brand: string | undefined, saltName: string): string {
  if (brand) return brand
  const parts = saltName.split(/\s*\+\s*/).map(cleanIngredient).filter(Boolean)
  return parts.slice(0, 2).join(' + ') + (parts.length > 2 ? ' +…' : '')
}

function cleanSaltDisplay(saltName: string): string {
  return saltName
    .split(/\s*\+\s*/)
    .map(cleanIngredient)
    .filter(Boolean)
    .join(' + ')
}

const ShieldIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const PillIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20.5L3.5 13.5a5 5 0 017.07-7.07l7 7a5 5 0 01-7.07 7.07z"/>
    <line x1="9" y1="15" x2="15" y2="9"/>
  </svg>
)

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
)

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { brand } = await searchParams
  const medicine = await getMedicineBySlug(slug)
  if (!medicine) return {}

  const heading = getHeading(brand, medicine.salt_name)
  const cleanSalt = cleanSaltDisplay(medicine.salt_name)
  return {
    title: `${heading} Price in India | Compare Pharmacies | MedCompare`,
    description: `${heading} (${cleanSalt}) price comparison across Apollo, 1mg, Netmeds, PharmEasy. Find cheaper generic alternatives instantly.`,
  }
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { pincode, brand } = await searchParams

  const medicine = await getMedicineBySlug(slug)
  if (!medicine) notFound()

  const [prices, generic] = await Promise.all([
    getPricesForMedicine(medicine.id),
    getGenericForSalt(medicine.salt_name),
  ])

  const stores = pincode ? await getNearestStores(pincode) : []

  const cheapestOnline = prices[0]?.price ?? null
  const savings =
    cheapestOnline && generic?.jan_aushadhi_mrp
      ? calculateSavings(cheapestOnline, generic.jan_aushadhi_mrp)
      : null

  const heading = getHeading(brand, medicine.salt_name)

  const PHARMACY_LABELS: Record<string, string> = {
    '1mg': '1mg',
    pharmeasy: 'PharmEasy',
    apollo: 'Apollo',
    netmeds: 'Netmeds',
    medplus: 'MedPlus',
  }

  return (
    <div className="page-enter">
      {/* AppNavbar */}
      <div className="glass-overlay sticky top-14 z-20" style={{
        height: 56, borderBottom: '1px solid var(--glass-inner)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', textDecoration: 'none', flexShrink: 0,
          }}>
            <BackIcon />
          </a>
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '-0.025em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {heading}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Medicine header */}
        <div style={{ marginBottom: 20 }}>
          {/* Category chip */}
          {medicine.form && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--periwinkle-surface)', border: '1px solid var(--periwinkle-border)',
              color: 'var(--periwinkle)', fontSize: 11, fontWeight: 600,
              borderRadius: 20, padding: '4px 10px', marginBottom: 10,
            }}>
              <PillIcon />
              {medicine.form}
            </span>
          )}

          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem, 4vw, 1.9rem)',
            fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em',
            lineHeight: 1.1, marginBottom: 6,
          }}>
            {heading}
          </h1>

          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 10 }}>
            {cleanSaltDisplay(medicine.salt_name)}
            {medicine.strength && ` · ${medicine.strength}`}
            {medicine.pack_size && ` · ${medicine.pack_size}`}
          </p>

          {medicine.nppa_ceiling && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--gold-surface)', border: '1px solid var(--gold-border)',
              color: 'var(--gold-text)', fontSize: 12, fontWeight: 600,
              borderRadius: 20, padding: '5px 10px',
            }}>
              <ShieldIcon />
              {`NPPA ceiling ₹${medicine.nppa_ceiling}`}
            </span>
          )}
        </div>

        {/* Generic alert */}
        {generic && generic.jan_aushadhi_mrp && (
          <GenericAlert
            saltName={medicine.salt_name}
            janAushadhiName={generic.jan_aushadhi_name}
            janAushadhiPrice={generic.jan_aushadhi_mrp}
            brandPrice={cheapestOnline}
            savings={savings}
          />
        )}

        {/* Price comparison */}
        <section style={{ marginTop: 28 }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Online pharmacy prices
          </h2>

          {prices.filter(p => p.price !== null).length === 0 ? (
            <div className="glass-card" style={{ borderRadius: 18, padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No prices found yet for this medicine.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Run <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 6 }}>npm run scrape:prices</code> to fetch live prices.
              </p>
            </div>
          ) : (
            <div>
              {(() => {
                const withPrices = prices.filter(p => p.price !== null)
                const minPrice = Math.min(...withPrices.map(p => p.price ?? Infinity))
                return withPrices.map((price, i) => (
                  <PriceCard
                    key={price.id}
                    pharmacy={price.pharmacy}
                    pharmacyLabel={PHARMACY_LABELS[price.pharmacy] ?? price.pharmacy}
                    price={price.price}
                    url={price.url ? buildAffiliateUrl(price.pharmacy, price.url) : null}
                    inStock={price.in_stock}
                    scrapedAt={price.scraped_at}
                    isCheapest={i === 0}
                    minPrice={minPrice}
                  />
                ))
              })()}
            </div>
          )}
        </section>

        {/* Jan Aushadhi store locator */}
        <StoreLocator
          slug={slug}
          currentPincode={pincode}
          stores={stores}
          janAushadhiPrice={generic?.jan_aushadhi_mrp ?? null}
        />

        {/* Disclaimer */}
        <p style={{ marginTop: 40, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Prices are scraped from pharmacy websites and may vary. Verify at pharmacy before purchase.
          MedCompare is a price comparison tool — not medical advice.
        </p>
      </div>
    </div>
  )
}
