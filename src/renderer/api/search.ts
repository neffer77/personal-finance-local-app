import type { EnrichedTransaction, TransactionFilter } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const searchApi = {
  async transactions(query: string, filter: TransactionFilter = {}): Promise<EnrichedTransaction[]> {
    const res: ApiResponse<EnrichedTransaction[]> = await window.api.search.transactions(query, filter)
    if (!res.success) throw new Error(res.error ?? 'Search failed')
    return res.data ?? []
  },
}
