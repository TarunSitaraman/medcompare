'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SavedMedicine } from '@/lib/saved'
import { removeSaved } from '@/lib/saved'
import { supabase } from '@/lib/supabase'

const PHARMACY_LABELS: Record<string, string> = {
  '1mg': '1mg', pharmeasy: 'PharmEasy', apollo: 'Apollo', netmeds: 'Netmeds', medplus: 'MedPlus',
}

type Props = {
  initialItems: SavedMedicine[]
  onCountChange?: (count: number) => void
}

export default function SavedList({ initialItems, onCountChange }: Props) {
  const [items, setItems] = useState<SavedMedicine[]>(initialItems)
  const [liveMinPrices, setLiveMinPrices] = useState<Map<string, { price: number; pharmacy: string }>>(new Map())
  const router = useRouter()

  useEffect(() => {
    if (initialItems.length === 0) return
    const ids = initialItems.map(m => m.id)
    supabase
      .from('prices')
      .select('medicine_id, price, pharmacy')
      .in('medicine_id', ids)
      .eq('in_stock', true)
      .order('price', { ascending: true })
      .then(({ data }) => {
        const map = new Map<string, { price: number; pharmacy: string }>()
        for (const row of data ?? []) {
          if (!map.has(row.medicine_id) && row.price !== null) {
            map.set(row.medicine_id, { price: row.price, pharmacy: row.pharmacy })
          }
        }
        setLiveMinPrices(map)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRemove(id: string) {
    const next = removeSaved(id)
    setItems(next)
    onCountChange?.(next.length)
  }

  if (items.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          My Medicines
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.length} saved</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map(medicine => {
          const live = liveMinPrices.get(medicine.id)
          const displayPrice = live?.price ?? medicine.min_price
          return (
            <div key={medicine.id} style={{
              background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-inner)', borderRadius: 18,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <button
                onClick={() => router.push(`/compare?slug=${encodeURIComponent(medicine.slug)}`)}
                style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {medicine.display_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {medicine.clean_salt}
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {displayPrice !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>₹{displayPrice}</div>
                    {live?.pharmacy && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {PHARMACY_LABELS[live.pharmacy] ?? live.pharmacy}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleRemove(medicine.id)}
                  style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                  aria-label="Remove from saved"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
