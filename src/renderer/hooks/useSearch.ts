import { useState, useEffect, useRef } from 'react'
import { searchApi } from '../api/search'
import { useAppStore } from '../stores/app.store'
import { useFilterStore } from '../stores/filter.store'
import type { EnrichedTransaction } from '../../shared/types'

const DEBOUNCE_MS = 300

export interface UseSearchResult {
  results: EnrichedTransaction[] | null   // null = no active search
  loading: boolean
  error: string | null
}

export function useSearch(): UseSearchResult {
  const { selectedCardId } = useAppStore()
  const { search, dateFrom, dateTo } = useFilterStore()

  const [results, setResults] = useState<EnrichedTransaction[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!search.trim()) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchApi.transactions(search, {
          cardId: selectedCardId,
          dateFrom: dateFrom ?? undefined,
          dateTo: dateTo ?? undefined,
        })
        setResults(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [search, selectedCardId, dateFrom, dateTo])

  return { results, loading, error }
}
