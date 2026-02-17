import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { getSetting, setSetting, getAllSettings } from '../services/settings.service'
import type { SettingUpdate } from '../../shared/types'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, (_event, key: string) => {
    try {
      return { success: true, data: getSetting(key) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, update: SettingUpdate) => {
    try {
      setSetting(update.key, update.value)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => {
    try {
      return { success: true, data: getAllSettings() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
