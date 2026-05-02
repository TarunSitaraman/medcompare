'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/data/medicines'
import SplashScreen from '@/components/SplashScreen'
import SavingsCard from '@/components/SavingsCard'

const EXAMPLES = ['Dolo 650', 'Metformin 500mg', 'Azithromycin', 'Paracetamol']

const FEATURES = [
  { num: '01', title: 'Compare online prices', desc: 'Apollo, 1mg, PharmEasy, Netmeds side by side. Real prices from their websites, updated daily.' },
  { num: '02', title: 'Find the generic alternative', desc: 'Same molecule. Same effect. Jan Aushadhi generics are often 80–90% cheaper than branded versions.' },
  { num: '03', title: 'NPPA ceiling check', desc: 'See the government-set maximum price. If a pharmacy charges above it, you\'ll know immediately.' },
  { num: '04', title: 'Locate Jan Aushadhi stores', desc: '19,467 government stores across India. Search by pincode to find the one nearest to you.' },
]

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('splashShown')) {
      setShowSplash(true)
    }
  }, [])

  function handleSplashDone() {
    setShowSplash(false)
    sessionStorage.setItem('splashShown', '1')
  }

  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data.results ?? [])
        setShowDropdown(true)
      } finally { setLoading(false) }
    }, 250)
  }, [query])

  function handleSelect(medicine: SearchResult) {
    const params = new URLSearchParams()
    if (medicine.matched_brand) params.set('brand', medicine.matched_brand)
    const qs = params.toString()
    router.push(`/compare/${medicine.slug}${qs ? `?${qs}` : ''}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (suggestions.length > 0) handleSelect(suggestions[0])
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}

      {/* Hero */}
      <div style={{ background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden' }}>
        {/* Mesh glows */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, var(--gold-glow), transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '56px 20px 64px', display: 'flex', alignItems: 'center', gap: 48, position: 'relative' }}>
          {/* Left: headline + search */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge */}
            <div style={{ marginBottom: 20 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'var(--accent-surface)', border: '1px solid var(--accent-border)',
                color: 'var(--accent-text)', fontSize: 11, fontWeight: 600,
                borderRadius: 20, padding: '5px 11px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2.2s ease infinite', display: 'block' }} />
                Free · No signup · Prices updated daily
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 5vw, 2.1rem)',
              fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.1,
              color: 'var(--text-primary)', marginBottom: 14,
            }}>
              Stop overpaying<br />for <span style={{ color: 'var(--accent)' }}>medicines.</span>
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 22, maxWidth: 440 }}>
              Compare Apollo, 1mg, PharmEasy, Netmeds — all at once.
              Find generics at Jan Aushadhi that cost 90% less.
            </p>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {/* Search icon */}
                  <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder="Search medicine or salt name…"
                    autoFocus
                    style={{
                      width: '100%', height: 58,
                      paddingLeft: 50, paddingRight: 126,
                      background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      border: '1.5px solid var(--glass-inner)',
                      borderRadius: 18, fontSize: 15, color: 'var(--text-primary)',
                      transition: 'all 0.25s ease',
                    }}
                    onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--glass-inner)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  {loading && (
                    <div style={{ position: 'absolute', right: 120, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  )}
                  <button type="submit" style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    height: 46, padding: '0 18px',
                    background: 'var(--grad-cta)', color: 'white',
                    border: 'none', borderRadius: 14,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 3px 14px var(--accent-glow)',
                    transition: 'transform 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'translateY(-50%) scale(0.97)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'translateY(-50%)')}
                  >
                    Compare
                  </button>
                </div>
              </form>

              {/* Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'var(--bg-glass-strong)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--glass-inner)',
                  borderRadius: 16, boxShadow: 'var(--sh-lg)', zIndex: 50, overflow: 'hidden',
                }}>
                  {suggestions.map((medicine, i) => (
                    <button key={medicine.id} onMouseDown={() => handleSelect(medicine)} style={{
                      width: '100%', padding: '13px 16px', textAlign: 'left',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {medicine.display_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {medicine.salt_name}{medicine.strength ? ` · ${medicine.strength}` : ''}{medicine.form ? ` · ${medicine.form}` : ''}
                        </div>
                      </div>
                      {medicine.has_generic && (
                        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--accent-text)', background: 'var(--accent-surface)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          Generic ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Example chips */}
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try:</span>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => { setQuery(ex); inputRef.current?.focus() }} style={{
                  background: 'var(--bg-glass)', backdropFilter: 'blur(8px)',
                  border: '1px solid var(--glass-inner)',
                  borderRadius: 20, padding: '7px 14px',
                  fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-inner)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Savings illustration (desktop only) */}
          <div className="hidden lg:block" style={{ flexShrink: 0, width: 280 }}>
            <SavingsCard brandPrice={850} genericPrice={89} brandLabel="Brand (PharmEasy)" genericLabel="Generic (Jan Aushadhi)" eyebrow="EXAMPLE SAVINGS" />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { value: '90%', label: 'max savings\nat generic', size: '2rem', color: 'var(--gold)' },
            { value: '19,467', label: 'Jan Aushadhi\nstores', size: '1.45rem', color: 'var(--accent)' },
            { value: '4,346', label: 'NPPA-capped\nmedicines', size: '1.15rem', color: 'var(--periwinkle)' },
          ].map(({ value, label, size, color }, i) => (
            <div key={value} style={{ textAlign: 'center', padding: '8px 0', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Everything you need to stop overpaying
        </h2>
        <div>
          {FEATURES.map(({ num, title, desc }) => (
            <div key={num} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--border-strong)', flexShrink: 0, width: 40, lineHeight: 1 }}>
                {num}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust footer */}
      <div style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', padding: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Data from <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>NPPA</span>,{' '}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>PMBJP (Jan Aushadhi)</span>, and live pharmacy scraping.
          Prices are indicative — verify at pharmacy before purchase.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </>
  )
}
