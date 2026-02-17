import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { listCategories, createCategory, updateCategory } from '../services/category.service'
import type { CategoryCreate, CategoryUpdate } from '../../shared/types'

export function registerCategoryHandlers(): void {
  ipcMain.handle(IPC.CATEGORIES_LIST, () => {
    try {
      return { success: true, data: listCategories() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.CATEGORIES_CREATE, (_event, data: CategoryCreate) => {
    try {
      return { success: true, data: createCategory(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.CATEGORIES_UPDATE, (_event, data: CategoryUpdate) => {
    try {
      return { success: true, data: updateCategory(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
