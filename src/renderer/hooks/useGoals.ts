import { useState, useEffect, useCallback } from 'react'
import { goalsApi } from '../api/goals'
import type { Goal, GoalCreate, GoalUpdate } from '../../shared/types'

export interface UseGoalsResult {
  goals: Goal[]
  loading: boolean
  error: string | null
  create: (data: GoalCreate) => Promise<Goal>
  update: (data: GoalUpdate) => Promise<void>
  remove: (id: number) => Promise<void>
  refetch: () => void
}

export function useGoals(): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGoals(await goalsApi.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (data: GoalCreate): Promise<Goal> => {
    const goal = await goalsApi.create(data)
    setGoals((prev) => [...prev, goal])
    return goal
  }, [])

  const update = useCallback(async (data: GoalUpdate): Promise<void> => {
    const updated = await goalsApi.update(data)
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
  }, [])

  const remove = useCallback(async (id: number): Promise<void> => {
    await goalsApi.delete(id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  return { goals, loading, error, create, update, remove, refetch: fetch }
}
