import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import ThemeToggle from '@/components/ThemeToggle'

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

const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
    <rect x="4" y="10" width="12" height="16" rx="6" fill="white" opacity="0.92"/>
    <rect x="14" y="10" width="12" height="16" rx="6" fill="white" opacity="0.70"/>
    <rect x="14" y="10" width="2" height="16" fill="white" opacity="0.22"/>
    <path d="M20 18 L28 18 M25 15 L28 18 L25 21"
          stroke="white" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
  </svg>
)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <head>
        {/* Read theme from localStorage before paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        `}} />
      </head>
      <body>
        {/* App banner header */}
        <header style={{
          background: 'linear-gradient(135deg, oklch(32% 0.20 250) 0%, oklch(50% 0.18 232) 100%)',
          padding: '18px 24px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* App icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              border: '1.5px solid rgba(255,255,255,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                <rect x="4" y="10" width="12" height="16" rx="6" fill="white" opacity="0.95"/>
                <rect x="14" y="10" width="12" height="16" rx="6" fill="white" opacity="0.70"/>
                <rect x="14" y="10" width="2" height="16" fill="white" opacity="0.22"/>
                <path d="M20 18 L28 18 M25 15 L28 18 L25 21" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
              </svg>
            </div>
            {/* Wordmark */}
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'white', lineHeight: 1.1 }}>
                Medi<span style={{ color: 'oklch(85% 0.14 210)' }}>Compare</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)', marginTop: 1, fontWeight: 500 }}>
                Medicine price comparison · India
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="page-enter">{children}</main>

        {/* Bottom padding for mobile bottom nav + safe area */}
        <div className="sm:hidden" style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }} />

        {/* Bottom nav (mobile only) */}
        <BottomNav />

        <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', marginTop: 64, paddingBlock: 40 }}
                className="show-desktop">
          <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span style={{
                width: 22, height: 22, background: 'var(--grad-cta)', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 36 36" fill="none">
                  <rect x="4" y="10" width="12" height="16" rx="6" fill="white" opacity="0.92"/>
                  <rect x="14" y="10" width="12" height="16" rx="6" fill="white" opacity="0.70"/>
                  <path d="M20 18 L28 18 M25 15 L28 18 L25 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                </svg>
              </span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                MediCompare
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>— price comparison, not medical advice.</span>
            </div>
            <div className="flex gap-5" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <a href="/about" className="hover:text-[var(--text-primary)] transition-colors">About</a>
              <a href="/jan-aushadhi" className="hover:text-[var(--text-primary)] transition-colors">Jan Aushadhi</a>
              <a href="https://github.com/TarunSitaraman/medcompare" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}


function BottomNav() {
  return (
    <nav className="hide-desktop fixed bottom-0 left-0 right-0 z-50 glass-overlay"
         style={{ borderTop: '1px solid var(--glass-inner)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-start justify-around pt-2.5" style={{ height: 64 }}>
        {[
          {
            href: '/', label: 'Home',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          },
          {
            href: '/compare', label: 'Compare',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          },
          {
            href: '/jan-aushadhi', label: 'Stores',
            icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          },
        ].map(({ href, label, icon }) => (
          <a key={href} href={href}
             className="flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl relative"
             style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            {icon}
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
