import { useState, useEffect, useCallback } from 'react'
import { snapshotsApi } from '../api/snapshots'
import type { MonthlySnapshot, SnapshotIncomeUpdate, SnapshotSummary } from '../../shared/types'

export interface UseSnapshotsResult {
  snapshots: MonthlySnapshot[]
  summary: SnapshotSummary | null
  loading: boolean
  error: string | null
  updateIncome: (data: SnapshotIncomeUpdate) => Promise<void>
  refetch: () => void
}

const DEFAULT_SUMMARY: SnapshotSummary = {
  avgMonthlySpendCents: 0,
  avgMonthlyCreditsCents: 0,
  avgMonthlyNetSpendCents: 0,
  avgSavingsRate: null,
  monthsWithIncome: 0,
  latestMonth: null,
}

export function useSnapshots(cardId?: number | null): UseSnapshotsResult {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([])
  const [summary, setSummary] = useState<SnapshotSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [snaps, sum] = await Promise.all([
        snapshotsApi.list(cardId),
        snapshotsApi.summary(),
      ])
      setSnapshots(snaps)
      setSummary(sum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots')
      setSummary(DEFAULT_SUMMARY)
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => { fetch() }, [fetch])

  const updateIncome = useCallback(async (data: SnapshotIncomeUpdate): Promise<void> => {
    const updated = await snapshotsApi.updateIncome(data)
    setSnapshots((prev) => {
      const idx = prev.findIndex(
        (s) => s.month === data.month && s.cardId === data.cardId,
      )
      if (idx === -1) return [updated, ...prev]
      return prev.map((s, i) => (i === idx ? updated : s))
    })
    // Refresh summary after income change
    const sum = await snapshotsApi.summary()
    setSummary(sum)
  }, [])

  return { snapshots, summary, loading, error, updateIncome, refetch: fetch }
}
