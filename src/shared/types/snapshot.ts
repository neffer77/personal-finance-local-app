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
