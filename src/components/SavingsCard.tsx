interface Props {
  brandPrice: number
  genericPrice: number
  brandLabel: string
  genericLabel: string
  eyebrow: string
}

export default function SavingsCard({ brandPrice, genericPrice, brandLabel, genericLabel, eyebrow }: Props) {
  const saved = brandPrice - genericPrice
  const pct = Math.round((saved / brandPrice) * 100)

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--bg-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-inner)',
      borderRadius: 26,
      boxShadow: 'var(--sh-md), inset 0 1px 0 rgba(255,255,255,0.6)',
      padding: '16px 16px 14px',
    }}>
      {/* Gold ambient orb */}
      <div style={{
        position: 'absolute', bottom: -30, right: -30,
        width: 130, height: 130, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--gold-glow), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Eyebrow */}
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 12, textTransform: 'uppercase' }}>
        {eyebrow}
      </div>

      {/* Price pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {/* Brand pill */}
        <div style={{
          flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 18, padding: '10px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>{brandLabel}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            ₹{brandPrice}
          </div>
        </div>

        {/* "vs" circle */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        }}>
          vs
        </div>

        {/* Generic pill */}
        <div style={{
          flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 18, padding: '10px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 4 }}>{genericLabel}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            ₹{genericPrice}
          </div>
        </div>
      </div>

      {/* Footer savings bar */}
      <div style={{
        background: 'var(--grad-savings)',
        borderRadius: 16, padding: '9px 14px',
        boxShadow: '0 4px 18px oklch(48% 0.18 240 / 0.35)',
        position: 'relative',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
          Save ₹{saved} · {pct}% cheaper with generic
        </div>
      </div>
    </div>
  )
}
