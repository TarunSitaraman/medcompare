'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Store } from '@/lib/supabase'

interface Props {
  slug: string
  currentPincode: string | undefined
  stores: Store[]
  janAushadhiPrice: number | null
}

export default function StoreLocator({ slug, currentPincode, stores, janAushadhiPrice }: Props) {
  const [pincode, setPincode] = useState(currentPincode ?? '')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (pincode.length === 6) {
      router.push(`/compare/${slug}?pincode=${pincode}`)
    }
  }

  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        🏥 Find Jan Aushadhi store near you
      </h2>
      {janAushadhiPrice && (
        <p className="text-sm text-gray-500 mb-4">
          Generic available at Jan Aushadhi for ₹{janAushadhiPrice} — government-run stores across India.
        </p>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={pincode}
          onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter your pincode"
          className="flex-1 h-11 px-4 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
          maxLength={6}
        />
        <button
          type="submit"
          disabled={pincode.length !== 6}
          className="h-11 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
        >
          Find stores
        </button>
      </form>

      {stores.length > 0 && (
        <div className="space-y-3">
          {stores.map(store => (
            <div key={store.id} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="font-medium text-gray-800">{store.name}</div>
              {store.address && <div className="text-sm text-gray-500 mt-0.5">{store.address}</div>}
              <div className="text-sm text-gray-500">
                {store.city}{store.state ? `, ${store.state}` : ''} — {store.pincode}
              </div>
              {store.phone && (
                <a href={`tel:${store.phone}`} className="text-sm text-blue-600 mt-1 block">
                  📞 {store.phone}
                </a>
              )}
              {store.lat && store.lng && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 mt-1 block"
                >
                  📍 Get directions
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {currentPincode && stores.length === 0 && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
          No Jan Aushadhi stores found near pincode {currentPincode}.
          Try a nearby pincode or{' '}
          <a
            href="https://janaushadhi.gov.in/StoreLocation.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            search on the official website
          </a>.
        </p>
      )}
    </section>
  )
}
