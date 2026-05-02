import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
    <html lang="en" className={inter.variable}>
      <body>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="font-bold text-lg text-slate-900 tracking-tight">MedCompare</span>
            </a>
            <nav className="flex items-center gap-1 text-sm">
              <a href="/jan-aushadhi" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                Jan Aushadhi
              </a>
              <a href="/about" className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                How it works
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-slate-200 bg-white mt-20 py-10">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="font-semibold text-slate-700">MedCompare</span>
              <span>— price comparison tool, not medical advice.</span>
            </div>
            <div className="flex gap-5">
              <a href="/about" className="hover:text-slate-700 transition-colors">About</a>
              <a href="/jan-aushadhi" className="hover:text-slate-700 transition-colors">Jan Aushadhi</a>
              <a href="https://github.com/TarunSitaraman/medcompare" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
