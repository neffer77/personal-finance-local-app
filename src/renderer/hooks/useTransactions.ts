import { useState, useEffect, useCallback } from 'react'
import { transactionsApi } from '../api/transactions'
import { useAppStore } from '../stores/app.store'
import { useFilterStore } from '../stores/filter.store'
import { monthStartEnd } from '../lib/format'
import type { EnrichedTransaction, TransactionListResult } from '../../shared/types'

export interface UseTransactionsResult {
  transactions: EnrichedTransaction[]
  total: number
  page: number
  loading: boolean
  error: string | null
  refetch: () => void
  loadNextPage: () => void
}

export function useTransactions(): UseTransactionsResult {
  const { selectedCardId } = useAppStore()
  const { search, categoryId, dateFrom, dateTo, type, page, setPage } = useFilterStore()

  const [result, setResult] = useState<TransactionListResult>({
    transactions: [],
    total: 0,
    page: 1,
    limit: 100,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (fetchPage: number = 1, append = false) => {
    setLoading(true)
    setError(null)

    try {
      // Build date range from filter state or default to current month
      let resolvedFrom = dateFrom
      let resolvedTo = dateTo
      if (!resolvedFrom && !resolvedTo) {
        const now = new Date()
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const range = monthStartEnd(month)
        resolvedFrom = range.from
        resolvedTo = range.to
      }

      const data = await transactionsApi.list({
        cardId: selectedCardId,
        categoryId: categoryId,
        dateFrom: resolvedFrom ?? undefined,
        dateTo: resolvedTo ?? undefined,
        type: type ?? undefined,
        page: fetchPage,
        limit: 100,
      })

      setResult((prev) => ({
        ...data,
        transactions: append ? [...prev.transactions, ...data.transactions] : data.transactions,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [selectedCardId, categoryId, dateFrom, dateTo, type])

  // Refetch when filters or card selection changes (not search — that's handled by useSearch)
  useEffect(() => {
    fetch(1, false)
    setPage(1)
  }, [fetch, setPage])

  const loadNextPage = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    fetch(nextPage, true)
  }, [page, setPage, fetch])

  return {
    transactions: result.transactions,
    total: result.total,
    page: result.page,
    loading,
    error,
    refetch: () => fetch(1, false),
    loadNextPage,
  }
}
