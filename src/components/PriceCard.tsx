const PHARMACY_STYLES: Record<string, { bg: string; text: string; ring: string; abbr: string }> = {
  '1mg':      { bg: 'bg-red-50',    text: 'text-red-600',    ring: 'ring-red-200',    abbr: '1mg' },
  pharmeasy:  { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-200', abbr: 'PE' },
  apollo:     { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-200',   abbr: 'Ap' },
  netmeds:    { bg: 'bg-teal-50',   text: 'text-teal-600',   ring: 'ring-teal-200',   abbr: 'Nm' },
  medplus:    { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200', abbr: 'Mp' },
}

interface Props {
  pharmacy: string
  pharmacyLabel: string
  price: number | null
  url: string | null
  inStock: boolean
  scrapedAt: string
  isCheapest: boolean
  maxPrice: number
}

export default function PriceCard({
  pharmacy,
  pharmacyLabel,
  price,
  url,
  inStock,
  scrapedAt,
  isCheapest,
  maxPrice,
}: Props) {
  const hoursAgo = Math.round((Date.now() - new Date(scrapedAt).getTime()) / 3600000)
  const isStale = hoursAgo > 12
  const style = PHARMACY_STYLES[pharmacy] ?? { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', abbr: pharmacy.slice(0, 2) }
  const barPct = price && maxPrice > 0 ? Math.max(8, Math.round((price / maxPrice) * 100)) : 0

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
        isCheapest
          ? 'border-green-400 bg-green-50 shadow-sm shadow-green-100'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      {/* Pharmacy badge */}
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
        {style.abbr}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-slate-800 text-sm">{pharmacyLabel}</span>
          {isCheapest && (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium leading-none">
              Cheapest
            </span>
          )}
          {!inStock && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium leading-none">
              Out of stock
            </span>
          )}
        </div>

        {/* Price bar */}
        {price !== null && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCheapest ? 'bg-green-500' : 'bg-slate-300'}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Price + stale + buy */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="text-right">
          {price !== null ? (
            <>
              <div className={`text-xl font-bold tabular-nums ${isCheapest ? 'text-green-700' : 'text-slate-900'}`}>
                ₹{price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
              </div>
              {isStale && (
                <div className="text-xs text-amber-500 text-right">{hoursAgo}h ago</div>
              )}
            </>
          ) : (
            <span className="text-slate-300 text-xl">—</span>
          )}
        </div>

        {url && inStock ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap ${
              isCheapest
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Buy →
          </a>
        ) : (
          <div className="w-[72px]" />
        )}
      </div>
    </div>
  )
}
