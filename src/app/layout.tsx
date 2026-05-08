import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import AppInit from '@/components/AppInit'
import CartBadge from '@/components/CartBadge'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a3060',
}

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MedCompare — Find the Cheapest Medicine Price in India',
  description:
    'Compare medicine prices across Apollo, 1mg, Netmeds, PharmEasy and more. Find generic alternatives that cost 80% less. Free, instant, no signup required.',
  keywords: 'medicine price comparison india, generic medicine, jan aushadhi, cheap medicine india',
  openGraph: {
    title: 'MedCompare — Cheapest Medicine Prices in India',
    description: 'Compare prices instantly. Find generic alternatives. Save up to 90%.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body>
        <AppInit />

        {/* Header */}
        <header style={{
          background: 'linear-gradient(135deg, oklch(32% 0.20 250) 0%, oklch(50% 0.18 232) 100%)',
          padding: '0 24px',
          height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 13,
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                <rect x="4" y="10" width="12" height="16" rx="6" fill="white" opacity="0.95"/>
                <rect x="14" y="10" width="12" height="16" rx="6" fill="white" opacity="0.70"/>
                <rect x="14" y="10" width="2" height="16" fill="white" opacity="0.22"/>
                <path d="M20 18 L28 18 M25 15 L28 18 L25 21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'white', lineHeight: 1.1 }}>
                Med<span style={{ color: 'oklch(82% 0.14 210)' }}>Compare</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.52)', marginTop: 1, fontWeight: 500, letterSpacing: '0.01em' }}>
                Medicine prices · India
              </div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/cart" style={{ position: 'relative', width: 38, height: 38, borderRadius: 13, background: 'rgba(255,255,255,0.11)', border: '1.5px solid rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', flexShrink: 0 }} aria-label="Cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <CartBadge />
            </Link>
          </div>
        </header>

        <main className="page-enter">{children}</main>

        {/* Mobile bottom nav spacer */}
        <div className="sm:hidden" style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }} />

        <BottomNav />
        <SiteFooter />
      </body>
    </html>
  )
}

function BottomNav() {
  return (
    <nav className="hide-desktop fixed bottom-0 left-0 right-0 z-50 glass-overlay"
         style={{ borderTop: '1px solid var(--glass-inner)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10, height: 64 }}>
        <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 20px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 500 }}>Home</span>
        </Link>
        <Link href="/cart" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 20px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <CartBadge />
          </span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>Cart</span>
        </Link>
        <a href="https://janaushadhi.gov.in/StoreLocation.aspx" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '0 20px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 500 }}>Stores</span>
        </a>
      </div>
    </nav>
  )
}

function SiteFooter() {
  const year = new Date().getFullYear()

  const resources = [
    { label: 'Jan Aushadhi stores', href: 'https://janaushadhi.gov.in/StoreLocation.aspx' },
    { label: 'PMBJP portal', href: 'https://pmbjp.gov.in' },
    { label: 'NPPA drug prices', href: 'https://nppa.gov.in' },
    { label: 'GitHub', href: 'https://github.com/TarunSitaraman/medcompare' },
  ]

  return (
    <footer className="show-desktop" style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-subtle)',
      marginTop: 80,
    }}>
      {/* Main footer body */}
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '48px 24px 40px', display: 'flex', justifyContent: 'space-between', gap: 48 }}>

        {/* Brand column */}
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: 'var(--grad-cta)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px var(--accent-glow)',
            }}>
              <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
                <rect x="4" y="10" width="12" height="16" rx="6" fill="white" opacity="0.92"/>
                <rect x="14" y="10" width="12" height="16" rx="6" fill="white" opacity="0.70"/>
                <rect x="14" y="10" width="2" height="16" fill="white" opacity="0.22"/>
                <path d="M20 18 L28 18 M25 15 L28 18 L25 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              MedCompare
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>
            Compare medicine prices across India&apos;s top pharmacies. Find Jan Aushadhi generics that cost up to 90% less.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Free', 'No signup', 'Updated daily'].map(tag => (
              <span key={tag} style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                background: 'var(--bg-glass)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-strong)',
                borderRadius: 20, padding: '4px 10px',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Resources column */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
            Resources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resources.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
                style={{ fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {label}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Data integrity column */}
        <div style={{ maxWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
            Data sources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'NPPA', desc: 'Scheduled drug ceiling prices' },
              { label: 'PMBJP', desc: 'Jan Aushadhi generic catalogue' },
              { label: 'Live scraping', desc: 'Apollo, 1mg, PharmEasy, Netmeds' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', maxWidth: 1024, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          © {year} MedCompare
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.5 }}>
          Prices are indicative — verify at pharmacy before purchase. Not a substitute for medical advice.
        </span>
      </div>
    </footer>
  )
}
