import { useState, useEffect, useCallback } from 'react'
import { subscriptionsApi } from '../api/subscriptions'
import type {
  SubscriptionWithCost,
  SubscriptionCreate,
  SubscriptionUpdate,
  DetectSubscriptionsResult,
} from '../../shared/types'

export interface UseSubscriptionsResult {
  subscriptions: SubscriptionWithCost[]
  loading: boolean
  detecting: boolean
  error: string | null
  refetch: () => void
  detect: () => Promise<DetectSubscriptionsResult>
  create: (data: SubscriptionCreate) => Promise<void>
  update: (data: SubscriptionUpdate) => Promise<void>
  resetOverride: (id: number) => Promise<void>
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

  const create = useCallback(async (data: SubscriptionCreate): Promise<void> => {
    setError(null)
    try {
      await subscriptionsApi.create(data)
      await fetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription')
      throw err
    }
  }, [fetch])

  const update = useCallback(async (data: SubscriptionUpdate): Promise<void> => {
    await subscriptionsApi.update(data)
    // Refetch to get recalculated annual_cost_cents from the DB
    await fetch()
  }, [fetch])

  const resetOverride = useCallback(async (id: number): Promise<void> => {
    await subscriptionsApi.resetOverride(id)
    await fetch()
  }, [fetch])

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
    create,
    update,
    resetOverride,
    archive,
  }
}
