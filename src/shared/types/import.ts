export interface ImportRecord {
  id: number
  cardId: number
  filename: string
  fileHash: string
  rowCount: number
  importedCount: number
  skippedCount: number
  importedAt: string
}

export interface ImportResult {
  success: boolean
  importId?: number
  filename: string
  rowCount: number
  importedCount: number
  skippedCount: number
  errorCount: number
  errors: ImportRowError[]
}

export interface ImportRowError {
  row: number
  reason: string
  rawData?: string
}

export interface ImportRequest {
  filePath: string
  cardId: number
}
