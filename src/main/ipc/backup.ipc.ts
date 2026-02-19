import { ipcMain, app } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { createBackup, getDefaultBackupPath } from '../database/backup'

export function registerBackupHandlers(): void {
  ipcMain.handle(IPC.BACKUP_CREATE, async (_event, destPath?: string) => {
    try {
      const target = destPath ?? getDefaultBackupPath(app.getPath('userData'))
      await createBackup(target)
      return { success: true, data: { path: target } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
