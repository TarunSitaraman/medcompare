export type SavedMedicine = {
  id: string
  slug: string
  display_name: string
  clean_salt: string
  min_price: number | null
  saved_at: string
}

type SavedMedicineInput = Omit<SavedMedicine, 'saved_at'> & {
  saved_at?: string
}

const SAVED_KEY = 'medcompare_saved'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function normalizeMedicine(medicine: SavedMedicineInput): SavedMedicine {
  return {
    id: medicine.id,
    slug: medicine.slug,
    display_name: medicine.display_name,
    clean_salt: medicine.clean_salt,
    min_price: medicine.min_price ?? null,
    saved_at: medicine.saved_at ?? new Date().toISOString(),
  }
}

function isSavedMedicine(value: unknown): value is SavedMedicine {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.display_name === 'string' &&
    typeof candidate.clean_salt === 'string' &&
    (typeof candidate.min_price === 'number' || candidate.min_price === null) &&
    typeof candidate.saved_at === 'string'
  )
}

function readSaved(): SavedMedicine[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedMedicine)
  } catch {
    return []
  }
}

function writeSaved(items: SavedMedicine[]) {
  if (!canUseStorage()) return
  localStorage.setItem(SAVED_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('medcompare:saved-updated', { detail: { count: items.length } }))
}

export function getSaved(): SavedMedicine[] {
  return readSaved().sort((a, b) => b.saved_at.localeCompare(a.saved_at))
}

export function addSaved(medicine: SavedMedicineInput): SavedMedicine[] {
  const current = getSaved().filter(item => item.id !== medicine.id)
  const next = [normalizeMedicine(medicine), ...current]
  writeSaved(next)
  return next
}

export function removeSaved(id: string): SavedMedicine[] {
  const next = getSaved().filter(item => item.id !== id)
  writeSaved(next)
  return next
}

export function isSaved(id: string): boolean {
  return getSaved().some(item => item.id === id)
}

