import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getMedicineBySlug,
  getPricesForMedicine,
  getGenericForSalt,
  getNearestStores,
  calculateSavings,
  buildAffiliateUrl,
} from '@/lib/data/medicines'
import PriceCard from '@/components/PriceCard'
import GenericAlert from '@/components/GenericAlert'
import StoreLocator from '@/components/StoreLocator'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ pincode?: string; brand?: string }>
}

function cleanIngredient(s: string): string {
  return s.replace(/\s+(manufactured|marketed|m\/s|by)\b.*/i, '').trim()
}

function getHeading(brand: string | undefined, saltName: string): string {
  if (brand) return brand
  const parts = saltName.split(/\s*\+\s*/).map(cleanIngredient).filter(Boolean)
  return parts.slice(0, 2).join(' + ') + (parts.length > 2 ? ' +…' : '')
}

function cleanSaltDisplay(saltName: string): string {
  return saltName
    .split(/\s*\+\s*/)
    .map(cleanIngredient)
    .filter(Boolean)
    .join(' + ')
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { brand } = await searchParams
  const medicine = await getMedicineBySlug(slug)
  if (!medicine) return {}

  const heading = getHeading(brand, medicine.salt_name)

  const cleanSalt = cleanSaltDisplay(medicine.salt_name)
  return {
    title: `${heading} Price in India | Compare Pharmacies | MedCompare`,
    description: `${heading} (${cleanSalt}) price comparison across Apollo, 1mg, Netmeds, PharmEasy. Find cheaper generic alternatives instantly.`,
  }
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { pincode, brand } = await searchParams

  const medicine = await getMedicineBySlug(slug)
  if (!medicine) notFound()

  const [prices, generic] = await Promise.all([
    getPricesForMedicine(medicine.id),
    getGenericForSalt(medicine.salt_name),
  ])

  const stores = pincode ? await getNearestStores(pincode) : []

  const cheapestOnline = prices[0]?.price ?? null
  const savings =
    cheapestOnline && generic?.jan_aushadhi_mrp
      ? calculateSavings(cheapestOnline, generic.jan_aushadhi_mrp)
      : null

  const heading = getHeading(brand, medicine.salt_name)

  const PHARMACY_LABELS: Record<string, string> = {
    '1mg': '1mg',
    pharmeasy: 'PharmEasy',
    apollo: 'Apollo',
    netmeds: 'Netmeds',
    medplus: 'MedPlus',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-6">
        <a href="/" className="hover:text-blue-600">Home</a>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{heading}</span>
      </div>

      {/* Medicine header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{heading}</h1>
        <p className="text-gray-500 mt-1">
          {cleanSaltDisplay(medicine.salt_name)}
          {medicine.strength && ` · ${medicine.strength}`}
          {medicine.form && ` · ${medicine.form}`}
          {medicine.pack_size && ` · ${medicine.pack_size}`}
        </p>
        {medicine.nppa_ceiling && (
          <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1">
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
              NPPA ceiling: ₹{medicine.nppa_ceiling}
            </span>
          </p>
        )}
      </div>

      {/* Generic alert — most important info first */}
      {generic && generic.jan_aushadhi_mrp && (
        <GenericAlert
          saltName={medicine.salt_name}
          janAushadhiName={generic.jan_aushadhi_name}
          janAushadhiPrice={generic.jan_aushadhi_mrp}
          brandPrice={cheapestOnline}
          savings={savings}
        />
      )}

      {/* Price comparison table */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Online pharmacy prices</h2>

        {prices.filter(p => p.price !== null).length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
            <p>No prices found yet for this medicine.</p>
            <p className="text-sm mt-2">
              Run <code className="bg-gray-100 px-1 rounded">npm run scrape:prices</code> to fetch live prices.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const withPrices = prices.filter(p => p.price !== null)
              const maxPrice = Math.max(...withPrices.map(p => p.price ?? 0))
              return withPrices.map((price, i) => (
                <PriceCard
                  key={price.id}
                  pharmacy={price.pharmacy}
                  pharmacyLabel={PHARMACY_LABELS[price.pharmacy] ?? price.pharmacy}
                  price={price.price}
                  url={price.url ? buildAffiliateUrl(price.pharmacy, price.url) : null}
                  inStock={price.in_stock}
                  scrapedAt={price.scraped_at}
                  isCheapest={i === 0}
                  maxPrice={maxPrice}
                />
              ))
            })()}
          </div>
        )}
      </section>

      {/* Jan Aushadhi store locator */}
      <StoreLocator
        slug={slug}
        currentPincode={pincode}
        stores={stores}
        janAushadhiPrice={generic?.jan_aushadhi_mrp ?? null}
      />

      {/* Disclaimer */}
      <p className="mt-10 text-xs text-gray-400 text-center">
        Prices are scraped from pharmacy websites and may vary. Verify at pharmacy before purchase.
        MedCompare is a price comparison tool — not medical advice. Consult your doctor before
        substituting branded medicines with generics.
      </p>
    </div>
  )
}
