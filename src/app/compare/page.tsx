'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getMedicineBySlug,
  getPricesForMedicine,
  getGenericForSalt,
  getNearestStores,
  calculateSavings,
} from '@/lib/data/medicines'
import { supabase } from '@/lib/supabase'
import type { Medicine, Price, Generic, Store } from '@/lib/supabase'
import PriceCard from '@/components/PriceCard'
import GenericAlert from '@/components/GenericAlert'
import StoreLocator from '@/components/StoreLocator'

function cleanIngredient(s: string): string {
  return s.replace(/\s+(manufactured|marketed|m\s*\/?s|by)\b.*/i, '').trim()
}

function getHeading(brand: string | null | undefined, saltName: string): string {
  if (brand) return brand
  const parts = saltName.split(/\s*\+\s*/).map(cleanIngredient).filter(Boolean)
  return parts.slice(0, 2).join(' + ') + (parts.length > 2 ? ' +…' : '')
}

function cleanSaltDisplay(saltName: string): string {
  return saltName.split(/\s*\+\s*/).map(cleanIngredient).filter(Boolean).join(' + ')
}

const PHARMACY_LABELS: Record<string, string> = {
  '1mg': '1mg', pharmeasy: 'PharmEasy', apollo: 'Apollo', netmeds: 'Netmeds', medplus: 'MedPlus',
}

const ShieldIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const PillIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20.5L3.5 13.5a5 5 0 017.07-7.07l7 7a5 5 0 01-7.07 7.07z"/><line x1="9" y1="15" x2="15" y2="9"/>
  </svg>
)

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
)

function ComparePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') ?? ''
  const pincode = searchParams.get('pincode') ?? undefined
  const brand = searchParams.get('brand') ?? undefined

  const [medicine, setMedicine] = useState<Medicine | null>(null)
  const [prices, setPrices] = useState<Price[]>([])
  const [generic, setGeneric] = useState<Generic | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [queued, setQueued] = useState(false)
  const storeLocatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return }

    setLoading(true)
    setNotFound(false)

    getMedicineBySlug(slug).then(async med => {
      if (!med) { setNotFound(true); setLoading(false); return }
      setMedicine(med)

      const [priceData, genericData, storeData] = await Promise.all([
        getPricesForMedicine(med.id),
        getGenericForSalt(med.salt_name),
        pincode ? getNearestStores(pincode) : Promise.resolve([]),
      ])

      setPrices(priceData)
      setGeneric(genericData)
      setStores(storeData)

      // If no prices, add to scrape queue for next scraper run
      if (priceData.length === 0) {
        supabase.from('scrape_queue').upsert(
          { medicine_id: med.id, slug: med.slug, status: 'pending' },
          { onConflict: 'medicine_id', ignoreDuplicates: true }
        ).then(r => { if (!r.error) setQueued(true) })
      }

      setLoading(false)
    }).catch(() => { setNotFound(true); setLoading(false) })
  }, [slug, pincode])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (notFound || !medicine) return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 16 }}>Medicine not found.</p>
      <button onClick={() => router.push('/')} style={{ height: 44, padding: '0 20px', background: 'var(--grad-cta)', color: 'white', border: 'none', borderRadius: 16, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Back to search
      </button>
    </div>
  )

  const heading = getHeading(brand, medicine.salt_name)
  const cheapestOnline = prices[0]?.price ?? null
  const savings = cheapestOnline && generic?.jan_aushadhi_mrp
    ? calculateSavings(cheapestOnline, generic.jan_aushadhi_mrp)
    : null

  const withPrices = prices.filter(p => p.price !== null)
  const minPrice = withPrices.length > 0 ? Math.min(...withPrices.map(p => p.price ?? Infinity)) : 0

  return (
    <div className="page-enter">
      {/* AppNavbar */}
      <div className="glass-overlay sticky top-0 z-20" style={{ height: 56, borderBottom: '1px solid var(--glass-inner)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ width: 36, height: 36, borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
            <BackIcon />
          </button>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {heading}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* Medicine header */}
        <div style={{ marginBottom: 20 }}>
          {medicine.form && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--periwinkle-surface)', border: '1px solid var(--periwinkle-border)', color: 'var(--periwinkle)', fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '4px 10px', marginBottom: 10 }}>
              <PillIcon />{medicine.form}
            </span>
          )}
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 6 }}>
            {heading}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 10 }}>
            {cleanSaltDisplay(medicine.salt_name)}
            {medicine.strength && ` · ${medicine.strength}`}
            {medicine.pack_size && ` · ${medicine.pack_size}`}
          </p>
          {medicine.nppa_ceiling && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--gold-surface)', border: '1px solid var(--gold-border)', color: 'var(--gold-text)', fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '5px 10px' }}>
              <ShieldIcon />{`NPPA ceiling ₹${medicine.nppa_ceiling}`}
            </span>
          )}
        </div>

        {/* Generic alert */}
        {generic?.jan_aushadhi_mrp && (
          <div style={{ marginBottom: 20 }}>
          <GenericAlert
            saltName={medicine.salt_name}
            janAushadhiName={generic.jan_aushadhi_name}
            janAushadhiPrice={generic.jan_aushadhi_mrp}
            brandPrice={cheapestOnline}
            savings={savings}
            onFindStore={() => storeLocatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          </div>
        )}

        {/* Prices */}
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Online pharmacy prices
          </h2>
          {withPrices.length === 0 ? (
            <div className="glass-card" style={{ borderRadius: 24, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🕐</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Prices not yet scraped
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {queued
                  ? 'Added to queue — prices will appear after the next daily update.'
                  : 'This medicine hasn\'t been scraped yet. Check back tomorrow.'}
              </p>
            </div>
          ) : (
            <div>
              {withPrices.map((price, i) => (
                <PriceCard
                  key={price.id}
                  pharmacy={price.pharmacy}
                  pharmacyLabel={PHARMACY_LABELS[price.pharmacy] ?? price.pharmacy}
                  price={price.price}
                  url={price.url}
                  inStock={price.in_stock}
                  scrapedAt={price.scraped_at}
                  isCheapest={i === 0}
                  minPrice={minPrice}
                  perUnit={price.price_per_unit ? `₹${price.price_per_unit}/unit` : null}
                  nppaCeiling={medicine.nppa_ceiling ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* Store locator */}
        <div ref={storeLocatorRef} />
        <StoreLocator
          slug={slug}
          currentPincode={pincode}
          stores={stores}
          janAushadhiPrice={generic?.jan_aushadhi_mrp ?? null}
        />

        <p style={{ marginTop: 40, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Prices scraped from pharmacy websites and may vary. Not medical advice.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ComparePage />
    </Suspense>
  )
}
