import type { Goal, GoalCreate, GoalUpdate } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const goalsApi = {
  async list(): Promise<Goal[]> {
    const res: ApiResponse<Goal[]> = await window.api.goals.list()
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to list goals')
    return res.data
  },

  async create(data: GoalCreate): Promise<Goal> {
    const res: ApiResponse<Goal> = await window.api.goals.create(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to create goal')
    return res.data
  },

  async update(data: GoalUpdate): Promise<Goal> {
    const res: ApiResponse<Goal> = await window.api.goals.update(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update goal')
    return res.data
  },

  async delete(id: number): Promise<void> {
    const res: ApiResponse<void> = await window.api.goals.delete(id)
    if (!res.success) throw new Error(res.error ?? 'Failed to delete goal')
  },
}
