interface Props {
  saltName: string
  janAushadhiName: string | null
  janAushadhiPrice: number
  brandPrice: number | null
  savings: { amount: number; percentage: number; annualSavings: number } | null
}

export default function GenericAlert({ saltName, janAushadhiName, janAushadhiPrice, brandPrice, savings }: Props) {
  const whatsappText = encodeURIComponent(
    `💊 Found this on MedCompare!\n${janAushadhiName ?? saltName} at Jan Aushadhi store = ₹${janAushadhiPrice}\n` +
    (savings ? `That's ${savings.percentage}% cheaper than the brand version!\n` : '') +
    `Check: ${typeof window !== 'undefined' ? window.location.href : ''}`
  )

  return (
    <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <h3 className="font-bold text-green-800 text-lg mb-1">
            Generic alternative available
          </h3>
          <p className="text-green-700 font-medium">
            {janAushadhiName ?? saltName} at Jan Aushadhi store:
            <span className="text-2xl font-bold ml-2">₹{janAushadhiPrice}</span>
          </p>
          {savings && brandPrice && (
            <div className="mt-2 space-y-1">
              <p className="text-green-700 text-sm">
                That&apos;s <strong>{savings.percentage}% cheaper</strong> than the brand name
                (₹{brandPrice.toFixed(0)} online)
              </p>
              <p className="text-green-600 text-sm">
                Switch and save approximately <strong>₹{savings.annualSavings}/year</strong>
              </p>
            </div>
          )}
          <p className="text-xs text-green-600 mt-3">
            Same active ingredient ({saltName}). Same therapeutic effect. Government-approved.
          </p>

          <div className="mt-4 flex gap-3 flex-wrap">
            <a
              href={`?pincode=`}
              className="text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Find nearest Jan Aushadhi store ↓
            </a>
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-white hover:bg-gray-50 text-green-700 border border-green-300 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📤 Share savings
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
