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
} from '../shared/types'

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

// Type export for renderer usage
export type ElectronAPI = typeof api
