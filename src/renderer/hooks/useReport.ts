import { useState, useEffect, useCallback } from 'react'
import { reportsApi } from '@renderer/api/reports'
import type { ReportFilter, ReportSummary } from '@shared/types'

interface UseReportReturn {
  report: ReportSummary | null
  owners: string[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useReport(filter: ReportFilter): UseReportReturn {
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [owners, setOwners] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOwners = useCallback(async () => {
    try {
      const res = await reportsApi.owners()
      if (res.success) setOwners((res.data as string[]) ?? [])
    } catch {
      // non-fatal — owners list is best-effort
    }
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await reportsApi.summary(filter)
      if (res.success) {
        setReport(res.data as ReportSummary)
      } else {
        setError(res.error ?? 'Failed to load report')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [filter.owner, filter.period]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchOwners() }, [fetchOwners])
  useEffect(() => { fetchReport() }, [fetchReport])

  return { report, owners, loading, error, refetch: fetchReport }
}
