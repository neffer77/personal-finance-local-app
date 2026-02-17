import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { listCards, createCard, updateCard, archiveCard } from '../services/card.service'
import type { CardCreate, CardUpdate } from '../../shared/types'

export function registerCardHandlers(): void {
  ipcMain.handle(IPC.CARDS_LIST, () => {
    try {
      return { success: true, data: listCards() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.CARDS_CREATE, (_event, data: CardCreate) => {
    try {
      return { success: true, data: createCard(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.CARDS_UPDATE, (_event, data: CardUpdate) => {
    try {
      return { success: true, data: updateCard(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.CARDS_ARCHIVE, (_event, id: number) => {
    try {
      archiveCard(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
