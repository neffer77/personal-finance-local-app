// All display formatting for monetary values.
// Input: integer cents. Output: display strings.
// NEVER do math on formatted strings — only use these for display.

export function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const c = String(abs % 100).padStart(2, '0')
  const sign = cents < 0 ? '-' : ''
  return `${sign}$${dollars.toLocaleString()}.${c}`
}

export function formatCentsCompact(cents: number): string {
  const abs = Math.abs(cents)
  if (abs >= 100000) {
    return `${cents < 0 ? '-' : ''}$${(abs / 100000).toFixed(1)}k`
  }
  return formatCents(cents)
}

export function formatCentsPositive(cents: number): string {
  // Always display as positive — caller controls the sign display
  return formatCents(Math.abs(cents))
}

export function parseDate(dateStr: string): Date {
  // Input: YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(dateStr: string): string {
  // Input: YYYY-MM-DD → Output: "Feb 15, 2026"
  const date = parseDate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr: string): string {
  // Input: YYYY-MM-DD → Output: "Feb 15"
  const date = parseDate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMonth(monthStr: string): string {
  // Input: "YYYY-MM" → Output: "February 2026"
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatMonthShort(monthStr: string): string {
  // Input: "YYYY-MM" → Output: "Feb 2026"
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthStartEnd(month: string): { from: string; to: string } {
  const [year, m] = month.split('-').map(Number)
  const from = `${year}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(year, m, 0).getDate()
  const to = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}
