'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/data/medicines'

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const examples = ['Dolo 650', 'Metformin 500mg', 'Azithromycin', 'Paracetamol']

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-10 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Find the cheapest price<br />
          <span className="text-blue-600">for any medicine in India</span>
        </h1>
        <p className="text-lg text-gray-500">
          Compare Apollo, 1mg, Netmeds, PharmEasy and more.
          Find generic alternatives that cost up to 90% less.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-xl relative">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Search medicine name or salt..."
                className="w-full h-14 px-5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-base shadow-sm"
                autoFocus
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <button
              type="submit"
              className="h-14 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Compare
            </button>
          </div>
        </form>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map(medicine => (
              <button
                key={medicine.id}
                onMouseDown={() => handleSelect(medicine)}
                className="w-full px-5 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">{medicine.display_name}</div>
                  <div className="text-sm text-gray-500 truncate">
                    {medicine.salt_name}
                    {medicine.strength ? ` · ${medicine.strength}` : ''}
                    {medicine.form ? ` · ${medicine.form}` : ''}
                  </div>
                </div>
                {medicine.has_generic && (
                  <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Generic available
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Example searches */}
      <div className="mt-5 flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-gray-400">Try:</span>
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Value props */}
      <div className="mt-16 grid sm:grid-cols-3 gap-6 max-w-3xl w-full text-center">
        {[
          { icon: '💊', title: 'Compare 5 pharmacies', desc: 'Apollo, 1mg, Netmeds, PharmEasy, MedPlus — all at once' },
          { icon: '🏷️', title: 'Find generic alternatives', desc: 'Same molecule, same effect — often 80–90% cheaper' },
          { icon: '🏥', title: 'Nearest Jan Aushadhi', desc: 'Government generic stores. Paracetamol for ₹2 instead of ₹16' },
        ].map(item => (
          <div key={item.title} className="p-5 bg-gray-50 rounded-xl">
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-semibold text-gray-800 mb-1">{item.title}</div>
            <div className="text-sm text-gray-500">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-12 text-center text-sm text-gray-400">
        <p>Free. No signup required. Prices updated every 6 hours.</p>
      </div>
    </div>
  )
}
