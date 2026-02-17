import { useState, useEffect } from 'react'
import { settingsApi } from '../api/settings'
import { useAppStore } from '../stores/app.store'
import type { AppSettings, SettingUpdate } from '../../shared/types'

export interface UseSettingsResult {
  settings: AppSettings | null
  loading: boolean
  error: string | null
  updateSetting: (update: SettingUpdate) => Promise<void>
}

export function useSettings(): UseSettingsResult {
  const { setTheme } = useAppStore()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsApi.getAll()
        setSettings(data)
        // Sync theme to app store
        setTheme(data.theme)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [setTheme])

  const updateSetting = async (update: SettingUpdate): Promise<void> => {
    await settingsApi.set(update)
    setSettings((prev) => {
      if (!prev) return prev
      // Map DB key to AppSettings property
      const keyMap: Record<string, keyof AppSettings> = {
        theme: 'theme',
        summary_bar_visible: 'summaryBarVisible',
        default_date_range: 'defaultDateRange',
        sidebar_collapsed: 'sidebarCollapsed',
      }
      const prop = keyMap[update.key]
      if (!prop) return prev
      // Boolean coercion for boolean settings
      const value = update.value === 'true' ? true : update.value === 'false' ? false : update.value
      return { ...prev, [prop]: value }
    })
    // Sync theme change immediately
    if (update.key === 'theme') {
      setTheme(update.value as AppSettings['theme'])
    }
  }

  return { settings, loading, error, updateSetting }
}
