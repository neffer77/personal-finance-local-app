import type { AppSettings, SettingUpdate } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const settingsApi = {
  async getAll(): Promise<AppSettings> {
    const res: ApiResponse<AppSettings> = await window.api.settings.getAll()
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to get settings')
    return res.data
  },

  async set(update: SettingUpdate): Promise<void> {
    const res: ApiResponse<void> = await window.api.settings.set(update)
    if (!res.success) throw new Error(res.error ?? 'Failed to update setting')
  },
}
