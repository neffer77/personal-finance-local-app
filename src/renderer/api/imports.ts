import type { ImportResult, ImportRequest } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const importsApi = {
  async importCSV(req: ImportRequest): Promise<ImportResult> {
    const res: ApiResponse<ImportResult> = await window.api.imports.importCSV(req)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Import failed')
    return res.data
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async list(): Promise<any[]> {
    const res: ApiResponse<unknown[]> = await window.api.imports.list()
    if (!res.success) throw new Error(res.error ?? 'Failed to list imports')
    return res.data ?? []
  },
}
