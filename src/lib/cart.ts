import type { SavedMedicine } from './saved'

export type CartMedicine = SavedMedicine

type CartMedicineInput = Omit<CartMedicine, 'saved_at'> & {
  saved_at?: string
}

const CART_KEY = 'medcompare_cart'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function normalizeMedicine(medicine: CartMedicineInput): CartMedicine {
  return {
    id: medicine.id,
    slug: medicine.slug,
    display_name: medicine.display_name,
    clean_salt: medicine.clean_salt,
    min_price: medicine.min_price ?? null,
    saved_at: medicine.saved_at ?? new Date().toISOString(),
  }
}

function isCartMedicine(value: unknown): value is CartMedicine {
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

function readCart(): CartMedicine[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCartMedicine)
  } catch {
    return []
  }
}

function writeCart(items: CartMedicine[]) {
  if (!canUseStorage()) return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('medcompare:cart-updated', { detail: { count: items.length } }))
}

export function getCart(): CartMedicine[] {
  return readCart().sort((a, b) => b.saved_at.localeCompare(a.saved_at))
}

export function addToCart(medicine: CartMedicineInput): CartMedicine[] {
  const current = getCart().filter(item => item.id !== medicine.id)
  const next = [normalizeMedicine(medicine), ...current]
  writeCart(next)
  return next
}

export function removeFromCart(id: string): CartMedicine[] {
  const next = getCart().filter(item => item.id !== id)
  writeCart(next)
  return next
}

export function clearCart() {
  writeCart([])
}

export function isInCart(id: string): boolean {
  return getCart().some(item => item.id === id)
}

