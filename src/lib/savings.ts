const SAVINGS_LOG_KEY = 'medcompare_savings_log'

export type SavingsLogEntry = {
  date: string
  amount: number
  medicineId: string
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function isSavingsLogEntry(value: unknown): value is SavingsLogEntry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.date === 'string' &&
    typeof candidate.amount === 'number' &&
    typeof candidate.medicineId === 'string'
  )
}

function readLog(): SavingsLogEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(SAVINGS_LOG_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavingsLogEntry)
  } catch {
    return []
  }
}

function writeLog(entries: SavingsLogEntry[]) {
  if (!canUseStorage()) return
  localStorage.setItem(SAVINGS_LOG_KEY, JSON.stringify(entries))
  window.dispatchEvent(
    new CustomEvent('medcompare:savings-updated', { detail: { total: entries.length } })
  )
}

export function getSavingsLog(): SavingsLogEntry[] {
  return readLog().sort((a, b) => b.date.localeCompare(a.date))
}

export function upsertSavingsLog(medicineId: string, amount: number, date = new Date()): SavingsLogEntry[] {
  const iso = date.toISOString()
  const day = iso.slice(0, 10)
  const current = getSavingsLog()

  const idx = current.findIndex(
    entry => entry.medicineId === medicineId && entry.date.slice(0, 10) === day
  )

  if (idx >= 0) {
    const next = [...current]
    next[idx] = { ...next[idx], amount }
    writeLog(next)
    return next
  }

  const next = [{ medicineId, amount, date: iso }, ...current]
  writeLog(next)
  return next
}

export function getThisMonthSavingsTotal(now = new Date()): number {
  const year = now.getFullYear()
  const month = now.getMonth()
  return getSavingsLog()
    .filter(entry => {
      const date = new Date(entry.date)
      return date.getFullYear() === year && date.getMonth() === month
    })
    .reduce((sum, entry) => sum + entry.amount, 0)
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}
