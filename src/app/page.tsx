'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/data/medicines'

const EXAMPLES = ['Dolo 650', 'Metformin 500mg', 'Azithromycin', 'Paracetamol']

const STATS = [
  { value: '4,346', label: 'price-capped medicines' },
  { value: '2,42,166', label: 'brand name mappings' },
  { value: '19,467', label: 'Jan Aushadhi stores' },
]

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="1" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Compare 4 pharmacies',
    desc: 'Apollo, 1mg, Netmeds, PharmEasy — real prices, side by side, instantly.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 6v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 3.5C8 3 9 2.5 10 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Generic alternatives',
    desc: 'Same molecule, same effect. Generics at Jan Aushadhi are often 80–90% cheaper.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2C7.24 2 5 4.24 5 7c0 4.25 5 11 5 11s5-6.75 5-11c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Nearest Jan Aushadhi',
    desc: '19,467 government generic stores across India. Paracetamol for ₹2 instead of ₹16.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14M3 6h14M3 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'NPPA price ceiling',
    desc: 'Government-set maximum prices shown for every capped medicine. Know if you\'re overpaying.',
  },
]

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data.results ?? [])
        setShowDropdown(true)
      } finally {
        setLoading(false)
      }
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
    <div>
      {/* Hero */}
      <div className="min-h-[82vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">

          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Free · No signup · Prices updated daily
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-center text-5xl sm:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-5">
            Find the cheapest<br />
            <span className="text-blue-600">medicine price</span><br />
            in India
          </h1>
          <p className="text-center text-lg text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">
            Compare Apollo, 1mg, Netmeds, PharmEasy — all at once.
            Find generic alternatives at Jan Aushadhi that cost 90% less.
          </p>

          {/* Search */}
          <div className="relative">
            <form onSubmit={handleSubmit}>
              <div className="relative flex items-center bg-white border-2 border-slate-200 rounded-2xl shadow-lg shadow-slate-200/60 focus-within:border-blue-500 focus-within:shadow-blue-100 transition-all duration-200">
                <div className="pl-5 text-slate-400 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.75"/>
                    <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search medicine name or salt… e.g. Dolo 650"
                  className="flex-1 h-16 px-4 bg-transparent text-slate-900 text-base placeholder:text-slate-400"
                  autoFocus
                />
                {loading && (
                  <div className="mr-4 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <div className="pr-2 shrink-0">
                  <button
                    type="submit"
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Compare
                  </button>
                </div>
              </div>
            </form>

            {/* Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/80 z-50 overflow-hidden">
                {suggestions.map((medicine, i) => (
                  <button
                    key={medicine.id}
                    onMouseDown={() => handleSelect(medicine)}
                    className={`w-full px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate text-sm">{medicine.display_name}</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {medicine.salt_name}
                        {medicine.strength ? ` · ${medicine.strength}` : ''}
                        {medicine.form ? ` · ${medicine.form}` : ''}
                      </div>
                    </div>
                    {medicine.has_generic && (
                      <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        Generic ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Examples */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 justify-center">
            <span className="text-sm text-slate-400">Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); inputRef.current?.focus() }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline underline-offset-2 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="border-y border-slate-200 bg-white py-8">
        <div className="max-w-3xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-bold text-slate-900 tabular-nums">{value}</div>
              <div className="text-sm text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 mb-10">
          Everything you need to stop overpaying
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                {icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof / trust */}
      <div className="bg-slate-900 py-12 px-4 text-center">
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
          Data from <span className="text-white font-medium">NPPA (National Pharmaceutical Pricing Authority)</span>,{' '}
          <span className="text-white font-medium">PMBJP (Jan Aushadhi)</span>, and live pharmacy scraping.{' '}
          Prices are indicative — verify at pharmacy before purchase.
        </p>
      </div>
    </div>
  )
}
