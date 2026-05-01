interface Props {
  pharmacyLabel: string
  price: number | null
  url: string | null
  inStock: boolean
  scrapedAt: string
  isCheapest: boolean
}

export default function PriceCard({ pharmacyLabel, price, url, inStock, scrapedAt, isCheapest }: Props) {
  const hoursAgo = Math.round((Date.now() - new Date(scrapedAt).getTime()) / 3600000)
  const isStale = hoursAgo > 12

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
        isCheapest
          ? 'border-green-400 bg-green-50'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="font-medium text-gray-800 w-36">{pharmacyLabel}</span>
        {isCheapest && (
          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
            Cheapest
          </span>
        )}
        {!inStock && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          {price !== null ? (
            <span className="text-xl font-bold text-gray-900">₹{price.toFixed(2)}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
          {isStale && (
            <div className="text-xs text-amber-500">{hoursAgo}h old</div>
          )}
        </div>

        {url && inStock && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Buy →
          </a>
        )}
      </div>
    </div>
  )
}
