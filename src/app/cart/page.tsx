'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCart, removeFromCart, clearCart, type CartMedicine } from '@/lib/cart'
import { getPricesForMedicines } from '@/lib/data/medicines'
import { optimizeCart, type PharmacyPrice } from '@/lib/cartOptimizer'
import { upsertSavingsLog } from '@/lib/savings'
import type { Price } from '@/lib/supabase'

const PHARMACY_LABELS: Record<string, string> = {
  '1mg': '1mg', pharmeasy: 'PharmEasy', apollo: 'Apollo', netmeds: 'Netmeds', medplus: 'MedPlus',
}

const PHARMACY_COLORS: Record<string, string> = {
  '1mg': 'var(--ph-1mg)', pharmeasy: 'var(--ph-pharmeasy)', apollo: 'var(--ph-apollo)', netmeds: 'var(--ph-netmeds)', medplus: 'var(--accent)',
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartMedicine[]>([])
  const [allPrices, setAllPrices] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cart = getCart()
    setItems(cart)
    if (cart.length === 0) { setLoading(false); return }

    getPricesForMedicines(cart.map(m => m.id))
      .then(prices => { setAllPrices(prices); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function handleRemove(id: string) {
    const next = removeFromCart(id)
    setItems(next)
  }

  function handleClear() {
    clearCart()
    setItems([])
    setAllPrices([])
  }

  // Build price map: medicineId → [{pharmacy, price}]
  const pricesByMedicine = new Map<string, PharmacyPrice[]>()
  for (const item of items) {
    const mPrices: PharmacyPrice[] = allPrices
      .filter(p => p.medicine_id === item.id && p.price !== null)
      .map(p => ({ pharmacy: p.pharmacy, price: p.price as number }))
    if (mPrices.length > 0) pricesByMedicine.set(item.id, mPrices)
  }

  const result = optimizeCart(pricesByMedicine)

  // Savings: max total (most expensive option) vs mixed best
  const maxTotals: Record<string, number> = {}
  for (const item of items) {
    const mPrices = pricesByMedicine.get(item.id) ?? []
    if (mPrices.length > 0) {
      maxTotals[item.id] = Math.max(...mPrices.map(p => p.price))
    }
  }
  const maxTotal = Object.values(maxTotals).reduce((a, b) => a + b, 0)
  const savings = result.mixed ? Math.max(0, maxTotal - result.mixed.total) : 0

  // Log savings when we have a result
  useEffect(() => {
    if (!result.mixed || savings <= 0) return
    for (const entry of result.mixed.breakdown) {
      upsertSavingsLog(entry.medicineId, maxTotals[entry.medicineId] - entry.price)
    }
  }, [result.mixed?.total]) // eslint-disable-line react-hooks/exhaustive-deps

  const nameById = new Map(items.map(m => [m.id, m.display_name]))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div className="page-enter">
      {/* Sticky navbar */}
      <div className="glass-overlay sticky top-0 z-20" style={{ height: 56, borderBottom: '1px solid var(--glass-inner)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
            <BackIcon />
          </button>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', flex: 1 }}>
            My Cart {items.length > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>· {items.length} item{items.length !== 1 ? 's' : ''}</span>}
          </span>
          {items.length > 0 && (
            <button onClick={handleClear} style={{ height: 32, padding: '0 12px', borderRadius: 10, background: 'none', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrashIcon /> Clear all
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 80px' }}>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Your cart is empty</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Add medicines from the compare page</p>
            <button onClick={() => router.push('/')} style={{ height: 44, padding: '0 24px', background: 'var(--grad-cta)', color: 'white', border: 'none', borderRadius: 16, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Search medicines
            </button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(medicine => {
                  const mPrices = pricesByMedicine.get(medicine.id) ?? []
                  const minP = mPrices.length > 0 ? Math.min(...mPrices.map(p => p.price)) : null
                  return (
                    <div key={medicine.id} style={{
                      background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid var(--glass-inner)', borderRadius: 20, padding: '14px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                            {medicine.display_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                            {medicine.clean_salt}
                          </div>
                          {/* Pharmacy price row */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {mPrices.map(p => (
                              <span key={p.pharmacy} style={{
                                fontSize: 11, fontWeight: 600,
                                color: PHARMACY_COLORS[p.pharmacy] ?? 'var(--text-secondary)',
                                background: 'var(--bg-subtle)', borderRadius: 8, padding: '3px 8px',
                              }}>
                                {PHARMACY_LABELS[p.pharmacy] ?? p.pharmacy} ₹{p.price}
                              </span>
                            ))}
                            {mPrices.length === 0 && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Prices not available</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                          {minP !== null && (
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 800, color: 'var(--gold)' }}>
                              from ₹{minP}
                            </div>
                          )}
                          <button onClick={() => handleRemove(medicine.id)} style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Optimizer results */}
            {(result.singleBest || result.mixed) && (
              <section>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 12 }}>
                  Best buying strategy
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Best single pharmacy */}
                  {result.singleBest && (
                    <div style={{
                      background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      border: '1.5px solid var(--accent-border)', borderRadius: 22, padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '3px 9px' }}>
                          Buy all from one place
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
                          ₹{result.singleBest.total}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                          at {PHARMACY_LABELS[result.singleBest.pharmacy] ?? result.singleBest.pharmacy}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        All medicines available on one platform — easiest option.
                      </p>
                    </div>
                  )}

                  {/* Best mixed */}
                  {result.mixed && (
                    <div style={{
                      background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      border: '1.5px solid var(--gold-border)', borderRadius: 22, padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-text)', background: 'var(--gold-surface)', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '3px 9px' }}>
                          Best mixed — cheapest overall
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.03em' }}>
                          ₹{result.mixed.total}
                        </span>
                        {savings > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-text)', background: 'var(--gold-surface)', borderRadius: 8, padding: '2px 7px' }}>
                            saves ₹{savings}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {result.mixed.breakdown.map(entry => (
                          <div key={entry.medicineId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                              {nameById.get(entry.medicineId) ?? entry.medicineId}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <span style={{ color: PHARMACY_COLORS[entry.pharmacy] ?? 'var(--text-muted)', fontWeight: 600 }}>
                                {PHARMACY_LABELS[entry.pharmacy] ?? entry.pharmacy}
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{entry.price}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </section>
            )}

            {/* No prices available */}
            {result.singleBest === null && result.mixed === null && !loading && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-subtle)', borderRadius: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Price data not available for cart items yet. Check back after the next daily update.</p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
