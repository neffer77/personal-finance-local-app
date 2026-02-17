export interface Transaction {
  id: number
  cardId: number
  importId: number
  transactionDate: string   // YYYY-MM-DD
  postedDate: string        // YYYY-MM-DD
  description: string
  originalCategory: string
  type: string
  amountCents: number       // negative = charge, positive = credit/return
  memo: string | null
  displayName: string | null
  categoryId: number | null
  notes: string | null
  isReturn: boolean
  dedupHash: string
  createdAt: string
  updatedAt: string
}

// Enriched view — joins card and resolved category
export interface EnrichedTransaction extends Transaction {
  effectiveCategory: string
  effectiveName: string
  cardName: string
  cardOwner: string
}

export interface TransactionUpdate {
  id: number
  displayName?: string
  categoryId?: number | null
  notes?: string | null
}

export interface TransactionFilter {
  cardId?: number | null        // null = all cards
  search?: string
  categoryId?: number | null
  dateFrom?: string             // YYYY-MM-DD
  dateTo?: string               // YYYY-MM-DD
  type?: string                 // "Sale" | "Payment" | "Return"
  page?: number
  limit?: number
}

export interface TransactionListResult {
  transactions: EnrichedTransaction[]
  total: number
  page: number
  limit: number
}
