const PHARMACY_CONFIG: Record<string, { color: string; abbr: string }> = {
  '1mg':      { color: 'oklch(52% 0.19 20)',  abbr: '1mg' },
  pharmeasy:  { color: 'oklch(60% 0.17 48)',  abbr: 'PE'  },
  apollo:     { color: 'oklch(48% 0.18 240)', abbr: 'Ap'  },
  netmeds:    { color: 'oklch(52% 0.16 192)', abbr: 'Nm'  },
  medplus:    { color: 'oklch(55% 0.16 295)', abbr: 'Mp'  },
}

interface Props {
  pharmacy: string
  pharmacyLabel: string
  price: number | null
  mrp?: number | null
  url: string | null
  inStock: boolean
  scrapedAt: string
  isCheapest: boolean
  minPrice: number
  perUnit?: string | null
  cashback?: string | null
}

export default function PriceCard({ pharmacy, pharmacyLabel, price, mrp, url, inStock, scrapedAt, isCheapest, minPrice, perUnit, cashback }: Props) {
  const hoursAgo = Math.round((Date.now() - new Date(scrapedAt).getTime()) / 3600000)
  const isStale = hoursAgo > 12
  const cfg = PHARMACY_CONFIG[pharmacy] ?? { color: 'oklch(55% 0.05 240)', abbr: pharmacy.slice(0, 2).toUpperCase() }
  const barPct = price && minPrice > 0 ? Math.round((minPrice / price) * 100) : 0

  return (
    <div style={{
      position: 'relative',
      background: isCheapest
        ? `linear-gradient(135deg, var(--accent-surface) 0%, transparent 55%), var(--bg-glass)`
        : 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: isCheapest
        ? '1.5px solid var(--accent-border)'
        : '1.5px solid var(--glass-inner)',
      borderRadius: 18,
      padding: '14px 16px',
      marginBottom: 10,
      boxShadow: isCheapest
        ? '0 0 0 1.5px var(--accent-border), 0 4px 24px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.45)'
        : 'var(--sh-sm), inset 0 1px 0 rgba(255,255,255,0.45)',
      overflow: 'hidden',
    }}>
      {/* Best price tag */}
      {isCheapest && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'var(--accent)', color: 'white',
          fontSize: 10, fontWeight: 700,
          borderRadius: '0 18px 0 12px',
          padding: '4px 12px',
        }}>
          Best price
        </div>
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {/* Badge */}
        <div style={{
          width: 46, height: 46, borderRadius: 14, flexShrink: 0,
          background: cfg.color, color: 'white',
          fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
        }}>
          {cfg.abbr}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{pharmacyLabel}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: inStock ? 'var(--accent)' : 'var(--text-muted)', marginTop: 1 }}>
            {inStock ? 'In stock' : 'Out of stock'}
            {isStale && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>· {hoursAgo}h ago</span>}
          </div>
        </div>

        {/* Price */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {price !== null ? (
            <>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: isCheapest ? '1.6rem' : '1.15rem',
                fontWeight: 800,
                color: isCheapest ? 'var(--accent)' : 'var(--text-primary)',
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}>
                ₹{price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
              </div>
              {mrp && mrp > price && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  ₹{mrp.toFixed(0)}
                </div>
              )}
            </>
          ) : (
            <span style={{ fontSize: '1.2rem', color: 'var(--border-strong)' }}>—</span>
          )}
        </div>
      </div>

      {/* Price bar */}
      {price !== null && (
        <div style={{ height: 3, background: 'var(--border-strong)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${barPct}%`,
            background: isCheapest
              ? 'linear-gradient(90deg, var(--accent-dim), var(--accent-bright))'
              : 'var(--border-strong)',
            transition: 'width 0.7s cubic-bezier(0.34,1.4,0.64,1)',
          }} />
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: cashback ? 'var(--accent-text)' : 'var(--text-muted)' }}>
          {cashback ?? perUnit ?? ''}
        </div>

        {url && inStock ? (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{
            height: 34, padding: '0 14px',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            borderRadius: 10,
            ...(isCheapest ? {
              background: 'var(--grad-cta)', color: 'white',
              boxShadow: '0 2px 10px var(--accent-glow)',
            } : {
              background: 'none',
              border: '1.5px solid var(--border-strong)',
              color: 'var(--text-secondary)',
            }),
          }}>
            {isCheapest ? 'Buy' : 'View'} →
          </a>
        ) : !inStock ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unavailable</span>
        ) : null}
      </div>
    </div>
  )
}
