import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import {
  listSubscriptions,
  createSubscription,
  updateSubscription,
  resetSubscriptionOverride,
  archiveSubscription,
  detectSubscriptions,
} from '../services/subscription.service'
import type { SubscriptionCreate, SubscriptionUpdate } from '../../shared/types'

export function registerSubscriptionHandlers(): void {
  ipcMain.handle(IPC.SUBSCRIPTIONS_LIST, () => {
    try {
      return { success: true, data: listSubscriptions() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SUBSCRIPTIONS_DETECT, () => {
    try {
      return { success: true, data: detectSubscriptions() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SUBSCRIPTIONS_CREATE, (_event, data: SubscriptionCreate) => {
    try {
      return { success: true, data: createSubscription(data) }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[subscriptions:create] error:', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC.SUBSCRIPTIONS_UPDATE, (_event, data: SubscriptionUpdate) => {
    try {
      return { success: true, data: updateSubscription(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SUBSCRIPTIONS_RESET_OVERRIDE, (_event, id: number) => {
    try {
      return { success: true, data: resetSubscriptionOverride(id) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SUBSCRIPTIONS_ARCHIVE, (_event, id: number) => {
    try {
      archiveSubscription(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
