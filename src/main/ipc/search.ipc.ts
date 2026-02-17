import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { searchTransactions } from '../services/search.service'
import type { TransactionFilter } from '../../shared/types'

export function registerSearchHandlers(): void {
  ipcMain.handle(IPC.SEARCH_TRANSACTIONS, (_event, query: string, filter: TransactionFilter) => {
    try {
      return { success: true, data: searchTransactions(query, filter) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
