export type PharmacyPrice = {
  pharmacy: string
  price: number
}

export type MixedBreakdown = {
  medicineId: string
  pharmacy: string
  price: number
}

export type CartOptimizerResult = {
  singleBest: { pharmacy: string; total: number } | null
  mixed: { total: number; breakdown: MixedBreakdown[] } | null
}

export function optimizeCart(
  pricesByMedicine: Map<string, PharmacyPrice[]>
): CartOptimizerResult {
  if (pricesByMedicine.size === 0) {
    return { singleBest: null, mixed: null }
  }

  const allPharmacies = new Set<string>()
  for (const entries of pricesByMedicine.values()) {
    for (const entry of entries) {
      allPharmacies.add(entry.pharmacy)
    }
  }

  let singleBest: { pharmacy: string; total: number } | null = null

  for (const pharmacy of allPharmacies) {
    let total = 0
    let valid = true

    for (const entries of pricesByMedicine.values()) {
      const match = entries.find(entry => entry.pharmacy === pharmacy)
      if (!match) {
        valid = false
        break
      }
      total += match.price
    }

    if (valid && (!singleBest || total < singleBest.total)) {
      singleBest = { pharmacy, total }
    }
  }

  const breakdown: MixedBreakdown[] = []
  let mixedTotal = 0

  for (const [medicineId, entries] of pricesByMedicine) {
    if (entries.length === 0) {
      return { singleBest, mixed: null }
    }

    const cheapest = entries.reduce((best, current) =>
      current.price < best.price ? current : best
    )

    breakdown.push({
      medicineId,
      pharmacy: cheapest.pharmacy,
      price: cheapest.price,
    })
    mixedTotal += cheapest.price
  }

  return {
    singleBest,
    mixed: {
      total: mixedTotal,
      breakdown,
    },
  }
}

