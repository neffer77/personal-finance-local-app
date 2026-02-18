import type { MonthlySnapshot, SnapshotIncomeUpdate, SnapshotSummary } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const snapshotsApi = {
  async list(cardId?: number | null): Promise<MonthlySnapshot[]> {
    const res: ApiResponse<MonthlySnapshot[]> = await window.api.snapshots.list(cardId)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to list snapshots')
    return res.data
  },

  async updateIncome(data: SnapshotIncomeUpdate): Promise<MonthlySnapshot> {
    const res: ApiResponse<MonthlySnapshot> = await window.api.snapshots.updateIncome(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update income')
    return res.data
  },

  async summary(): Promise<SnapshotSummary> {
    const res: ApiResponse<SnapshotSummary> = await window.api.snapshots.summary()
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to load summary')
    return res.data
  },
}
