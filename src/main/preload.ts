import { contextBridge, ipcRenderer, shell } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type {
  TransactionFilter,
  TransactionUpdate,
  CardCreate,
  CardUpdate,
  CategoryCreate,
  CategoryUpdate,
  RuleCreate,
  RuleUpdate,
  ImportRequest,
  SettingUpdate,
  SubscriptionUpdate,
  GoalCreate,
  GoalUpdate,
  SnapshotIncomeUpdate,
  UserCreate,
  ReportFilter,
} from '../shared/types'

console.log('[preload] Preload script starting, imports successful')

// Typed IPC API exposed to renderer via window.api
const api = {
  transactions: {
    list: (filter: TransactionFilter) =>
      ipcRenderer.invoke(IPC.TRANSACTIONS_LIST, filter),
    get: (id: number) =>
      ipcRenderer.invoke(IPC.TRANSACTIONS_GET, id),
    update: (data: TransactionUpdate) =>
      ipcRenderer.invoke(IPC.TRANSACTIONS_UPDATE, data),
  },

  imports: {
    importCSV: (req: ImportRequest) =>
      ipcRenderer.invoke(IPC.IMPORT_CSV, req),
    list: () =>
      ipcRenderer.invoke(IPC.IMPORT_LIST),
  },

  cards: {
    list: () =>
      ipcRenderer.invoke(IPC.CARDS_LIST),
    create: (data: CardCreate) =>
      ipcRenderer.invoke(IPC.CARDS_CREATE, data),
    update: (data: CardUpdate) =>
      ipcRenderer.invoke(IPC.CARDS_UPDATE, data),
    archive: (id: number) =>
      ipcRenderer.invoke(IPC.CARDS_ARCHIVE, id),
  },

  categories: {
    list: () =>
      ipcRenderer.invoke(IPC.CATEGORIES_LIST),
    create: (data: CategoryCreate) =>
      ipcRenderer.invoke(IPC.CATEGORIES_CREATE, data),
    update: (data: CategoryUpdate) =>
      ipcRenderer.invoke(IPC.CATEGORIES_UPDATE, data),
  },

  rules: {
    list: () =>
      ipcRenderer.invoke(IPC.RULES_LIST),
    create: (data: RuleCreate) =>
      ipcRenderer.invoke(IPC.RULES_CREATE, data),
    update: (data: RuleUpdate) =>
      ipcRenderer.invoke(IPC.RULES_UPDATE, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC.RULES_DELETE, id),
  },

  search: {
    transactions: (query: string, filter?: TransactionFilter) =>
      ipcRenderer.invoke(IPC.SEARCH_TRANSACTIONS, query, filter ?? {}),
  },

  settings: {
    get: (key: string) =>
      ipcRenderer.invoke(IPC.SETTINGS_GET, key),
    set: (update: SettingUpdate) =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, update),
    getAll: () =>
      ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
  },

  subscriptions: {
    list: () =>
      ipcRenderer.invoke(IPC.SUBSCRIPTIONS_LIST),
    detect: () =>
      ipcRenderer.invoke(IPC.SUBSCRIPTIONS_DETECT),
    update: (data: SubscriptionUpdate) =>
      ipcRenderer.invoke(IPC.SUBSCRIPTIONS_UPDATE, data),
    archive: (id: number) =>
      ipcRenderer.invoke(IPC.SUBSCRIPTIONS_ARCHIVE, id),
  },

  goals: {
    list: () =>
      ipcRenderer.invoke(IPC.GOALS_LIST),
    create: (data: GoalCreate) =>
      ipcRenderer.invoke(IPC.GOALS_CREATE, data),
    update: (data: GoalUpdate) =>
      ipcRenderer.invoke(IPC.GOALS_UPDATE, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC.GOALS_DELETE, id),
  },

  snapshots: {
    list: (cardId?: number | null) =>
      ipcRenderer.invoke(IPC.SNAPSHOTS_LIST, cardId),
    updateIncome: (data: SnapshotIncomeUpdate) =>
      ipcRenderer.invoke(IPC.SNAPSHOTS_UPDATE_INCOME, data),
    summary: () =>
      ipcRenderer.invoke(IPC.SNAPSHOTS_SUMMARY),
  },

  users: {
    list: () =>
      ipcRenderer.invoke(IPC.USERS_LIST),
    create: (data: UserCreate) =>
      ipcRenderer.invoke(IPC.USERS_CREATE, data),
    seed: () =>
      ipcRenderer.invoke(IPC.USERS_SEED),
  },

  reports: {
    summary: (filter: ReportFilter) =>
      ipcRenderer.invoke(IPC.REPORTS_SUMMARY, filter),
    owners: () =>
      ipcRenderer.invoke(IPC.REPORTS_OWNERS),
  },

  backup: {
    create: (destPath?: string) =>
      ipcRenderer.invoke(IPC.BACKUP_CREATE, destPath),
  },

  dialog: {
    openFile: (options?: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE, options),
    saveFile: (options?: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke(IPC.DIALOG_SAVE_FILE, options),
  },

  shell: {
    openPath: (path: string) => shell.openPath(path),
  },
}

contextBridge.exposeInMainWorld('api', api)
console.log('[preload] window.api successfully exposed via contextBridge')

// Type export for renderer usage
export type ElectronAPI = typeof api
