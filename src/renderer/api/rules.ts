import type { Rule, RuleCreate, RuleUpdate } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const rulesApi = {
  async list(): Promise<Rule[]> {
    const res: ApiResponse<Rule[]> = await window.api.rules.list()
    if (!res.success) throw new Error(res.error ?? 'Failed to list rules')
    return res.data ?? []
  },

  async create(data: RuleCreate): Promise<Rule> {
    const res: ApiResponse<Rule> = await window.api.rules.create(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to create rule')
    return res.data
  },

  async update(data: RuleUpdate): Promise<Rule> {
    const res: ApiResponse<Rule> = await window.api.rules.update(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update rule')
    return res.data
  },

  async delete(id: number): Promise<void> {
    const res: ApiResponse<void> = await window.api.rules.delete(id)
    if (!res.success) throw new Error(res.error ?? 'Failed to delete rule')
  },
}
