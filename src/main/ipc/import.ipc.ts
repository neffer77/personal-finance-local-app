import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { importCSV, listImports } from '../services/import.service'
import type { ImportRequest } from '../../shared/types'

export function registerImportHandlers(): void {
  ipcMain.handle(IPC.IMPORT_CSV, (_event, req: ImportRequest) => {
    try {
      const result = importCSV(req.filePath, req.cardId)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.IMPORT_LIST, () => {
    try {
      return { success: true, data: listImports() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
