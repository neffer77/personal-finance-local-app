import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { ReportFilter } from '@shared/types'
import { generateReport, listOwners } from '@main/services/report.service'

export function registerReportHandlers(): void {
  ipcMain.handle(IPC.REPORTS_SUMMARY, (_event, filter: ReportFilter) => {
    try {
      return { success: true, data: generateReport(filter) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.REPORTS_OWNERS, () => {
    try {
      return { success: true, data: listOwners() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
