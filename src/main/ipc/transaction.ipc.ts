import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { listTransactions, getTransaction, updateTransaction } from '../services/transaction.service'
import type { TransactionFilter, TransactionUpdate } from '../../shared/types'

export function registerTransactionHandlers(): void {
  ipcMain.handle(IPC.TRANSACTIONS_LIST, (_event, filter: TransactionFilter) => {
    try {
      return { success: true, data: listTransactions(filter) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.TRANSACTIONS_GET, (_event, id: number) => {
    try {
      const tx = getTransaction(id)
      if (!tx) return { success: false, error: `Transaction not found: ${id}` }
      return { success: true, data: tx }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.TRANSACTIONS_UPDATE, (_event, data: TransactionUpdate) => {
    try {
      return { success: true, data: updateTransaction(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
