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
import { isSaved, addSaved, removeSaved } from '@/lib/saved'
import { isInCart, addToCart, removeFromCart } from '@/lib/cart'

function formatAge(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

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

function pharmacySearchUrl(pharmacy: string, query: string): string {
  const q = encodeURIComponent(query)
  switch (pharmacy) {
    case '1mg':      return `https://www.1mg.com/search/all?name=${q}&filter=true&type=medicine`
    case 'pharmeasy': return `https://pharmeasy.in/search/all?name=${q}`
    case 'apollo':   return `https://www.apollopharmacy.in/search-medicines/${q}`
    case 'netmeds':  return `https://www.netmeds.com/catalogsearch/result?q=${q}`
    case 'medplus':  return `https://www.medplusmart.com/search?query=${q}`
    default:         return ''
  }
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
  const [saved, setSaved] = useState(false)
  const [inCart, setInCart] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const storeLocatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return }

    setLoading(true)
    setNotFound(false)

    getMedicineBySlug(slug).then(async med => {
      if (!med) { setNotFound(true); setLoading(false); return }
      setMedicine(med)
      setSaved(isSaved(med.id))
      setInCart(isInCart(med.id))

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

  function medicinePayload() {
    return {
      id: medicine!.id,
      slug: medicine!.slug,
      display_name: heading,
      clean_salt: cleanSaltDisplay(medicine!.salt_name),
      min_price: cheapestOnline,
    }
  }

  function toggleSaved() {
    if (saved) { removeSaved(medicine!.id); setSaved(false) }
    else { addSaved(medicinePayload()); setSaved(true) }
  }

  function handleAddToCart() {
    if (!inCart) { addToCart(medicinePayload()); setInCart(true) }
  }

  async function handleRefreshPrices() {
    if (!medicine || refreshing) return
    setRefreshing(true)
    setRefreshError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const res = await fetch(`${supabaseUrl}/functions/v1/live-scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ medicine_id: medicine.id, slug: medicine.slug, name: medicine.brand_name ?? medicine.salt_name, strength: medicine.strength }),
      })
      if (!res.ok) throw new Error('Scrape failed')
      const fresh = await getPricesForMedicine(medicine.id)
      setPrices(fresh)
    } catch {
      setRefreshError('Could not fetch live prices — try again shortly.')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="page-enter">
      {/* AppNavbar */}
      <div className="glass-overlay sticky top-0 z-20" style={{ height: 56, borderBottom: '1px solid var(--glass-inner)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ width: 36, height: 36, borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
            <BackIcon />
          </button>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {heading}
          </span>
          <button
            onClick={toggleSaved}
            aria-label={saved ? 'Unsave medicine' : 'Save medicine'}
            style={{ width: 36, height: 36, borderRadius: 14, background: saved ? 'var(--accent-surface)' : 'var(--bg-subtle)', border: `1px solid ${saved ? 'var(--accent-border)' : 'var(--border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'var(--accent)' : 'none'} stroke={saved ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button
            onClick={handleAddToCart}
            aria-label={inCart ? 'In cart' : 'Add to cart'}
            title={inCart ? 'In your cart — remove from cart page' : 'Add to cart'}
            style={{ width: 36, height: 36, borderRadius: 14, background: inCart ? 'var(--gold-surface)' : 'var(--bg-subtle)', border: `1px solid ${inCart ? 'var(--gold-border)' : 'var(--border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inCart ? 'default' : 'pointer', flexShrink: 0, transition: 'all 0.2s ease' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={inCart ? 'var(--gold)' : 'none'} stroke={inCart ? 'var(--gold)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </button>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Online pharmacy prices
              </h2>
              {prices[0]?.scraped_at && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Updated {formatAge(prices[0].scraped_at)}
                </div>
              )}
            </div>
            <button
              onClick={handleRefreshPrices}
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: refreshing ? 'var(--text-muted)' : 'var(--accent)', cursor: refreshing ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? 'spin 0.9s linear infinite' : 'none' }}>
                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {refreshing ? 'Refreshing…' : 'Live prices'}
            </button>
          </div>
          {refreshError && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
              {refreshError}
            </div>
          )}
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
              {withPrices.map((price, i) => {
                const searchQuery = medicine.brand_name ?? heading
                const resolvedUrl = price.url ?? pharmacySearchUrl(price.pharmacy, searchQuery)
                return (
                  <PriceCard
                    key={price.id}
                    pharmacy={price.pharmacy}
                    pharmacyLabel={PHARMACY_LABELS[price.pharmacy] ?? price.pharmacy}
                    price={price.price}
                    url={resolvedUrl}
                    isDirectUrl={!!price.url}
                    inStock={price.in_stock}
                    scrapedAt={price.scraped_at}
                    isCheapest={i === 0}
                    minPrice={minPrice}
                    perUnit={price.price_per_unit ? `₹${price.price_per_unit}/unit` : null}
                    nppaCeiling={medicine.nppa_ceiling ?? null}
                  />
                )
              })}
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
