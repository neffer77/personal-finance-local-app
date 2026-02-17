import type {
  TransactionFilter,
  TransactionUpdate,
  TransactionListResult,
  EnrichedTransaction,
} from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const transactionsApi = {
  async list(filter: TransactionFilter = {}): Promise<TransactionListResult> {
    const res: ApiResponse<TransactionListResult> = await window.api.transactions.list(filter)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to list transactions')
    return res.data
  },

  async get(id: number): Promise<EnrichedTransaction> {
    const res: ApiResponse<EnrichedTransaction> = await window.api.transactions.get(id)
    if (!res.success || !res.data) throw new Error(res.error ?? `Transaction ${id} not found`)
    return res.data
  },

  async update(data: TransactionUpdate): Promise<EnrichedTransaction> {
    const res: ApiResponse<EnrichedTransaction> = await window.api.transactions.update(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update transaction')
    return res.data
  },
}
