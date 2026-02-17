import type { EnrichedTransaction } from '../../shared/types'

export interface CategoryTotal {
  category: string
  amountCents: number     // negative = spend, positive = credit
  absAmountCents: number
  count: number
  percentage: number
}

export interface MonthlyTotal {
  month: string           // "YYYY-MM"
  totalSpendCents: number // always positive
  totalCreditsCents: number
  netSpendCents: number
  count: number
}

// Compute category totals for a set of transactions (excludes payments)
export function computeCategoryTotals(transactions: EnrichedTransaction[]): CategoryTotal[] {
  const map = new Map<string, { amountCents: number; count: number }>()

  for (const tx of transactions) {
    if (tx.type === 'Payment') continue
    const cat = tx.effectiveCategory
    const existing = map.get(cat) ?? { amountCents: 0, count: 0 }
    map.set(cat, {
      amountCents: existing.amountCents + tx.amountCents,
      count: existing.count + 1,
    })
  }

  // Total spend (negative amounts only)
  let totalSpend = 0
  for (const v of map.values()) {
    if (v.amountCents < 0) totalSpend += Math.abs(v.amountCents)
  }

  const totals: CategoryTotal[] = Array.from(map.entries()).map(([category, data]) => ({
    category,
    amountCents: data.amountCents,
    absAmountCents: Math.abs(data.amountCents),
    count: data.count,
    percentage: totalSpend > 0 ? (Math.abs(data.amountCents) / totalSpend) * 100 : 0,
  }))

  // Sort by absolute amount descending
  return totals.sort((a, b) => b.absAmountCents - a.absAmountCents)
}

// Group transactions by month
export function groupByMonth(transactions: EnrichedTransaction[]): Map<string, EnrichedTransaction[]> {
  const map = new Map<string, EnrichedTransaction[]>()
  for (const tx of transactions) {
    const month = tx.transactionDate.slice(0, 7) // "YYYY-MM"
    const existing = map.get(month) ?? []
    existing.push(tx)
    map.set(month, existing)
  }
  return map
}

// Compute monthly spend totals (sorted descending by month)
export function computeMonthlyTotals(transactions: EnrichedTransaction[]): MonthlyTotal[] {
  const byMonth = groupByMonth(transactions)
  const totals: MonthlyTotal[] = []

  for (const [month, txs] of byMonth.entries()) {
    let totalSpendCents = 0
    let totalCreditsCents = 0

    for (const tx of txs) {
      if (tx.type === 'Payment') continue
      if (tx.amountCents < 0) {
        totalSpendCents += Math.abs(tx.amountCents)
      } else {
        totalCreditsCents += tx.amountCents
      }
    }

    totals.push({
      month,
      totalSpendCents,
      totalCreditsCents,
      netSpendCents: totalSpendCents - totalCreditsCents,
      count: txs.filter((t) => t.type !== 'Payment').length,
    })
  }

  return totals.sort((a, b) => b.month.localeCompare(a.month))
}

// Net spend total for a set of transactions
export function netSpend(transactions: EnrichedTransaction[]): number {
  return transactions
    .filter((t) => t.type !== 'Payment')
    .reduce((sum, t) => sum + t.amountCents, 0)
}
