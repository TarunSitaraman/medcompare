import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import ThemeToggle from '@/components/ThemeToggle'

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
        {/* Sticky top navbar */}
        <header className="glass-overlay sticky top-0 z-50 border-b" style={{ borderColor: 'var(--glass-inner)', height: 56 }}>
          <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <span style={{
                width: 34, height: 34,
                background: 'var(--grad-cta)',
                borderRadius: 10,
                boxShadow: '0 4px 12px var(--accent-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LogoIcon />
              </span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                Medi<span style={{ color: 'var(--accent)' }}>Compare</span>
              </span>
            </a>

            <nav className="flex items-center gap-1">
              <a href="/jan-aushadhi" style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 8 }}
                 className="hover:bg-[var(--bg-subtle)] transition-colors">
                Jan Aushadhi
              </a>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main className="page-enter">{children}</main>

        {/* Bottom padding for mobile bottom nav */}
        <div className="h-24 sm:hidden" />

        {/* Bottom nav (mobile only) */}
        <BottomNav />

        <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', marginTop: 64, paddingBlock: 40 }}
                className="hidden sm:block">
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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 glass-overlay"
         style={{ height: 88, borderTop: '1px solid var(--glass-inner)' }}>
      <div className="flex items-start justify-around pt-2.5">
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
