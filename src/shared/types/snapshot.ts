export interface MonthlySnapshot {
  id: number
  month: string           // "YYYY-MM"
  cardId: number | null   // null = household total
  totalSpendCents: number
  totalCreditsCents: number
  netSpendCents: number
  transactionCount: number
  incomeCents: number | null
  savingsCents: number | null
  savingsRate: number | null
  createdAt: string
  updatedAt: string
}

export interface SnapshotIncomeUpdate {
  month: string
  cardId: number | null
  incomeCents: number | null
  savingsCents: number | null
}

export interface SnapshotSummary {
  avgMonthlySpendCents: number
  avgMonthlyCreditsCents: number
  avgMonthlyNetSpendCents: number
  avgSavingsRate: number | null
  monthsWithIncome: number
  latestMonth: string | null
}
