type Variant = 'default' | 'compact' | 'bold'

interface Props {
  saltName: string
  janAushadhiName: string | null
  janAushadhiPrice: number
  brandPrice: number | null
  savings: { amount: number; percentage: number; annualSavings: number } | null
  variant?: Variant
  onFindStore?: () => void
}

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.558 4.14 1.535 5.879L0 24l6.273-1.648A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.96 0-3.8-.538-5.373-1.473l-.385-.229-3.986 1.046 1.064-3.886-.252-.401A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
)

function buildWhatsApp(name: string, price: number, savings: Props['savings'], slug: string) {
  const text = `💊 Found this on MedCompare!\n${name} at Jan Aushadhi = ₹${price}\n` +
    (savings ? `That's ${savings.percentage}% cheaper than brand!\n` : '') +
    (typeof window !== 'undefined' ? window.location.href : `https://medcompare.in/compare/${slug}`)
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export default function GenericAlert({ saltName, janAushadhiName, janAushadhiPrice, brandPrice, savings, variant = 'default', onFindStore }: Props) {
  const name = janAushadhiName ?? saltName
  const waUrl = buildWhatsApp(name, janAushadhiPrice, savings, saltName.toLowerCase().replace(/\s+/g, '-'))

  if (variant === 'compact') return <CompactVariant name={name} genericPrice={janAushadhiPrice} brandPrice={brandPrice} savings={savings} waUrl={waUrl} onFindStore={onFindStore} />
  if (variant === 'bold') return <BoldVariant name={name} genericPrice={janAushadhiPrice} brandPrice={brandPrice} savings={savings} waUrl={waUrl} onFindStore={onFindStore} />
  return <DefaultVariant name={name} genericPrice={janAushadhiPrice} brandPrice={brandPrice} savings={savings} waUrl={waUrl} onFindStore={onFindStore} />
}

interface VProps {
  name: string
  genericPrice: number
  brandPrice: number | null
  savings: { amount: number; percentage: number; annualSavings: number } | null
  waUrl: string
  onFindStore?: () => void
}

function DefaultVariant({ name, genericPrice, brandPrice, savings, waUrl, onFindStore }: VProps) {
  return (
    <div style={{
      borderRadius: 28,
      background: 'var(--bg-glass)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1.5px solid var(--gold-border)',
      boxShadow: '0 4px 28px var(--gold-glow), var(--sh-md)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient orbs */}
      <div style={{ position: 'absolute', top: -30, right: -20, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, var(--gold-glow), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--gold-text)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Generic alternative available
      </div>

      {/* Prices */}
      <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>Cheapest brand price</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {brandPrice ? `₹${brandPrice.toFixed(0)}` : '—'}
          </div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-surface)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', flexShrink: 0 }}>
          <ArrowIcon />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 2 }}>Generic (Jan Aushadhi)</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            ₹{genericPrice}
          </div>
        </div>
      </div>

      {/* Savings block */}
      {savings && (
        <div style={{ margin: '0 16px 14px', background: 'var(--gold-surface)', border: '1px solid var(--gold-border)', borderRadius: 16, padding: '10px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-text)' }}>
            Save ₹{savings.amount.toFixed(0)} · {savings.percentage}% cheaper
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Switch and save ₹{savings.annualSavings}/year (estimated)
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ borderTop: '1px solid var(--gold-border)', display: 'flex' }}>
        <button onClick={onFindStore} style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--gold-text)', background: 'none', border: 'none', borderRight: '1px solid var(--gold-border)', cursor: 'pointer' }}>
          <PinIcon /> Find store
        </button>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#25D366', textDecoration: 'none' }}>
          <WhatsAppIcon /> Share saving
        </a>
      </div>
    </div>
  )
}

function CompactVariant({ name, genericPrice, brandPrice, savings, waUrl, onFindStore }: VProps) {
  return (
    <div className="glass-card" style={{ borderRadius: 26, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{name}</span>
        <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--gold-surface)', border: '1px solid var(--gold-border)', color: 'var(--gold-text)', borderRadius: 12, padding: '2px 7px' }}>Jan Aushadhi</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.1rem', fontWeight: 800, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>₹{genericPrice}</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>vs</span>
        {brandPrice && <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}>₹{brandPrice.toFixed(0)}</span>}
      </div>
      {savings && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold-text)', marginBottom: 12 }}>Save {savings.percentage}% · ₹{savings.amount.toFixed(0)} less</div>}
      <button onClick={onFindStore} style={{ width: '100%', height: 44, background: 'var(--grad-cta)', color: 'white', border: 'none', borderRadius: 16, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Find nearest Jan Aushadhi store →
      </button>
    </div>
  )
}

function BoldVariant({ name, genericPrice, brandPrice, savings, waUrl, onFindStore }: VProps) {
  return (
    <div style={{
      borderRadius: 28, overflow: 'hidden', position: 'relative',
      background: 'var(--grad-hero)',
      boxShadow: '0 8px 40px oklch(38% 0.18 240 / 0.40), var(--sh-lg)',
    }}>
      {/* Orbs */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

      <div style={{ padding: 20, position: 'relative' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>Generic available at Jan Aushadhi</div>

        {/* Prices row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {brandPrice && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Brand (online)</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}>₹{brandPrice.toFixed(0)}</div>
            </div>
          )}
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Generic (Jan Aushadhi)</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2.3rem', fontWeight: 800, color: 'white', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1 }}>₹{genericPrice}</div>
          </div>
        </div>

        {/* Savings pill */}
        {savings && (
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 18, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Save {savings.percentage}% · ₹{savings.amount.toFixed(0)} cheaper</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', marginTop: 2 }}>Switch and save ₹{savings.annualSavings}/year</div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onFindStore} style={{ flex: 1, height: 42, background: 'white', color: 'oklch(38% 0.18 240)', border: 'none', borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Find store →
          </button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 16, color: '#25D366', textDecoration: 'none' }}>
            <WhatsAppIcon />
          </a>
        </div>
      </div>
    </div>
  )
}
