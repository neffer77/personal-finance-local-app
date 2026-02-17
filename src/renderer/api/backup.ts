interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const backupApi = {
  async create(destPath?: string): Promise<{ path: string }> {
    const res: ApiResponse<{ path: string }> = await window.api.backup.create(destPath)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Backup failed')
    return res.data
  },
}
