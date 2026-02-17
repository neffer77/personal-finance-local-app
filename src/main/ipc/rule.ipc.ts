import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { listRules, createRule, updateRule, deleteRule } from '../services/rule.service'
import type { RuleCreate, RuleUpdate } from '../../shared/types'

export function registerRuleHandlers(): void {
  ipcMain.handle(IPC.RULES_LIST, () => {
    try {
      return { success: true, data: listRules(false) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RULES_CREATE, (_event, data: RuleCreate) => {
    try {
      return { success: true, data: createRule(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RULES_UPDATE, (_event, data: RuleUpdate) => {
    try {
      return { success: true, data: updateRule(data) }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.RULES_DELETE, (_event, id: number) => {
    try {
      deleteRule(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
