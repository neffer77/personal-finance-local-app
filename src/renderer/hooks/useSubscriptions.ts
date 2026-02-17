import { useState, useEffect, useCallback } from 'react'
import { subscriptionsApi } from '../api/subscriptions'
import type { SubscriptionWithCost, SubscriptionUpdate, DetectSubscriptionsResult } from '../../shared/types'

export interface UseSubscriptionsResult {
  subscriptions: SubscriptionWithCost[]
  loading: boolean
  detecting: boolean
  error: string | null
  refetch: () => void
  detect: () => Promise<DetectSubscriptionsResult>
  update: (data: SubscriptionUpdate) => Promise<void>
  archive: (id: number) => Promise<void>
}

export function useSubscriptions(): UseSubscriptionsResult {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCost[]>([])
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await subscriptionsApi.list()
      setSubscriptions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const detect = useCallback(async (): Promise<DetectSubscriptionsResult> => {
    setDetecting(true)
    setError(null)
    try {
      const result = await subscriptionsApi.detect()
      await fetch()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
      throw err
    } finally {
      setDetecting(false)
    }
  }, [fetch])

  const update = useCallback(async (data: SubscriptionUpdate): Promise<void> => {
    await subscriptionsApi.update(data)
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === data.id
          ? {
              ...s,
              ...(data.name !== undefined && { name: data.name }),
              ...(data.reviewDate !== undefined && { reviewDate: data.reviewDate }),
              ...(data.notes !== undefined && { notes: data.notes }),
              ...(data.isActive !== undefined && { isActive: data.isActive }),
            }
          : s,
      ),
    )
  }, [])

  const archive = useCallback(async (id: number): Promise<void> => {
    await subscriptionsApi.archive(id)
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)),
    )
  }, [])

  return {
    subscriptions,
    loading,
    detecting,
    error,
    refetch: fetch,
    detect,
    update,
    archive,
  }
}
