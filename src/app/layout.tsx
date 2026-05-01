import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-xl text-blue-700">
              MedCompare
            </a>
            <nav className="flex gap-6 text-sm text-gray-600">
              <a href="/about" className="hover:text-blue-600">How it works</a>
              <a href="/jan-aushadhi" className="hover:text-blue-600">Jan Aushadhi</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t mt-16 py-8 text-center text-sm text-gray-500">
          <p>MedCompare is a price comparison tool. Not medical advice.</p>
          <p className="mt-1">Always consult your doctor before substituting medicines.</p>
        </footer>
      </body>
    </html>
  )
}
