'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('out'), 2400)
    const doneTimer = setTimeout(() => onDone(), 3200)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0,
      background: 'linear-gradient(145deg, oklch(25% 0.16 252), oklch(45% 0.18 232) 50%, oklch(55% 0.16 218))',
      animation: phase === 'out' ? 'splash-out 0.8s cubic-bezier(0.4,0,0.6,1) forwards' : undefined,
    }}>
      {/* Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1.5px solid rgba(255,255,255,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'splash-icon 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both',
        marginBottom: 20,
      }}>
        <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="10" width="12" height="16" rx="6" fill="white" opacity="0.92"/>
          <rect x="14" y="10" width="12" height="16" rx="6" fill="white" opacity="0.70"/>
          <rect x="14" y="10" width="2" height="16" fill="white" opacity="0.22"/>
          <path d="M20 18 L28 18 M25 15 L28 18 L25 21"
                stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        </svg>
      </div>

      {/* Wordmark */}
      <div style={{
        fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em',
        animation: 'splash-fade-up 0.55s ease 0.55s both',
        marginBottom: 8,
      }}>
        <span style={{ color: 'white' }}>Medi</span>
        <span style={{ color: 'oklch(85% 0.14 210)' }}>Compare</span>
      </div>

      {/* Tagline */}
      <div style={{
        color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500,
        animation: 'splash-fade-up 0.55s ease 0.72s both',
        marginBottom: 32,
      }}>
        Pay less. Stay healthy.
      </div>

      {/* Dots */}
      <div style={{
        display: 'flex', gap: 6,
        animation: 'splash-fade-up 0.55s ease 0.88s both',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: `pulse-dot 1.4s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}
