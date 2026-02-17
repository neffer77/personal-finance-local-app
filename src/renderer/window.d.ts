// Type declarations for the IPC API exposed via contextBridge
// Mirrors the api object in src/main/preload.ts

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

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

declare global {
  interface Window {
    api: {
      transactions: {
        list: (filter: TransactionFilter) => Promise<ApiResponse<unknown>>
        get: (id: number) => Promise<ApiResponse<unknown>>
        update: (data: TransactionUpdate) => Promise<ApiResponse<unknown>>
      }
      imports: {
        importCSV: (req: ImportRequest) => Promise<ApiResponse<unknown>>
        list: () => Promise<ApiResponse<unknown>>
      }
      cards: {
        list: () => Promise<ApiResponse<unknown>>
        create: (data: CardCreate) => Promise<ApiResponse<unknown>>
        update: (data: CardUpdate) => Promise<ApiResponse<unknown>>
        archive: (id: number) => Promise<ApiResponse<unknown>>
      }
      categories: {
        list: () => Promise<ApiResponse<unknown>>
        create: (data: CategoryCreate) => Promise<ApiResponse<unknown>>
        update: (data: CategoryUpdate) => Promise<ApiResponse<unknown>>
      }
      rules: {
        list: () => Promise<ApiResponse<unknown>>
        create: (data: RuleCreate) => Promise<ApiResponse<unknown>>
        update: (data: RuleUpdate) => Promise<ApiResponse<unknown>>
        delete: (id: number) => Promise<ApiResponse<unknown>>
      }
      search: {
        transactions: (query: string, filter?: TransactionFilter) => Promise<ApiResponse<unknown>>
      }
      settings: {
        get: (key: string) => Promise<ApiResponse<unknown>>
        set: (update: SettingUpdate) => Promise<ApiResponse<unknown>>
        getAll: () => Promise<ApiResponse<unknown>>
      }
      backup: {
        create: (destPath?: string) => Promise<ApiResponse<unknown>>
      }
      dialog: {
        openFile: (options?: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFile: (options?: unknown) => Promise<{ canceled: boolean; filePath?: string }>
      }
      shell: {
        openPath: (path: string) => Promise<string>
      }
    }
  }
}
