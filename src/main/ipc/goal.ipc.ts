import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { listGoals, createGoal, updateGoal, deleteGoal } from '../services/goal.service'
import type { GoalCreate, GoalUpdate } from '../../shared/types'

export function registerGoalHandlers(): void {
  ipcMain.handle(IPC.GOALS_LIST, () => {
    try {
      return { success: true, data: listGoals() }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.GOALS_CREATE, (_event, data: GoalCreate) => {
    try {
      return { success: true, data: createGoal(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.GOALS_UPDATE, (_event, data: GoalUpdate) => {
    try {
      return { success: true, data: updateGoal(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.GOALS_DELETE, (_event, id: number) => {
    try {
      deleteGoal(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
