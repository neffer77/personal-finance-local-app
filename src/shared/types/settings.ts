export type Theme = 'light' | 'dark' | 'system'
export type DefaultDateRange = 'current_month' | 'last_30' | 'all'

export interface AppSettings {
  theme: Theme
  summaryBarVisible: boolean
  defaultDateRange: DefaultDateRange
  sidebarCollapsed: boolean
}

export type SettingKey = keyof AppSettings

export interface SettingUpdate {
  key: string
  value: string
}
