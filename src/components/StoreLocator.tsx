'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Store } from '@/lib/supabase'

interface Props {
  slug: string
  currentPincode: string | undefined
  stores: Store[]
  janAushadhiPrice: number | null
}

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)

const PhoneIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .98h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.33a16 16 0 006.29 6.29l1.42-1.42a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
)

export default function StoreLocator({ slug, currentPincode, stores, janAushadhiPrice }: Props) {
  const [pincode, setPincode] = useState(currentPincode ?? '')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (pincode.length === 6) {
      router.push(`/compare?slug=${slug}&pincode=${pincode}`)
    }
  }

  return (
    <section style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Jan Aushadhi stores
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>19,467 stores</span>
      </div>

      {janAushadhiPrice && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Generic available for <strong style={{ color: 'var(--gold)' }}>₹{janAushadhiPrice}</strong> — government-run stores across India.
        </p>
      )}

      {/* Pincode input */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <PinIcon />
          </div>
          <input
            type="text"
            value={pincode}
            onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter your pincode"
            maxLength={6}
            style={{
              width: '100%', height: 52,
              paddingLeft: 44, paddingRight: 16,
              background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1.5px solid var(--glass-inner)',
              borderRadius: 20, fontSize: 15, color: 'var(--text-primary)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--glass-inner)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
        <button
          type="submit"
          disabled={pincode.length !== 6}
          style={{
            height: 52, padding: '0 20px',
            background: pincode.length === 6 ? 'var(--grad-cta)' : 'var(--bg-subtle)',
            color: pincode.length === 6 ? 'white' : 'var(--text-muted)',
            border: 'none', borderRadius: 16,
            fontSize: 14, fontWeight: 600, cursor: pincode.length === 6 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          Find
        </button>
      </form>

      {/* Store cards */}
      {stores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stores.map(store => (
            <div key={store.id} className="glass-card" style={{ borderRadius: 20, padding: '14px 16px', display: 'flex', gap: 12 }}>
              {/* Pin icon wrap */}
              <div style={{ width: 38, height: 38, borderRadius: 14, background: 'var(--periwinkle-surface)', border: '1px solid var(--periwinkle-border)', color: 'var(--periwinkle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PinIcon />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>
                  {store.name}
                </div>
                {store.address && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 4 }}>
                    {store.address}
                    {store.city ? `, ${store.city}` : ''}
                    {store.state ? `, ${store.state}` : ''}
                    {` — ${store.pincode}`}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {store.lat && store.lng && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
                       target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 12, fontWeight: 600, color: 'var(--periwinkle)', textDecoration: 'none' }}>
                      Directions →
                    </a>
                  )}
                  {store.phone && (
                    <a href={`tel:${store.phone}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11.5, color: 'var(--text-secondary)',
                      background: 'var(--bg-subtle)', border: 'none',
                      borderRadius: 999, padding: '3px 10px', textDecoration: 'none',
                    }}>
                      <PhoneIcon /> {store.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentPincode && stores.length === 0 && (
        <div className="glass-card" style={{ borderRadius: 20, padding: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          No Jan Aushadhi stores found near <strong>{currentPincode}</strong>. Try a nearby pincode or{' '}
          <a href="https://janaushadhi.gov.in/StoreLocation.aspx" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            search on the official website
          </a>.
        </div>
      )}
    </section>
  )
}
