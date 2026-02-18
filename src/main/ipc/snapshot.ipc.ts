import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { getSnapshots, updateSnapshotIncome, getSnapshotSummary } from '../services/snapshot.service'
import type { SnapshotIncomeUpdate } from '../../shared/types'

export function registerSnapshotHandlers(): void {
  ipcMain.handle(IPC.SNAPSHOTS_LIST, (_event, cardId?: number | null) => {
    try {
      return { success: true, data: getSnapshots(cardId) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SNAPSHOTS_UPDATE_INCOME, (_event, data: SnapshotIncomeUpdate) => {
    try {
      return { success: true, data: updateSnapshotIncome(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SNAPSHOTS_SUMMARY, () => {
    try {
      return { success: true, data: getSnapshotSummary() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
