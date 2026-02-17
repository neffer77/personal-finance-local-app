import { getDatabase } from '../database/connection'
import type { AppSettings, Theme, DefaultDateRange } from '../../shared/types'

interface SettingRow {
  key: string
  value: string
}

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingRow | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value)
}

export function getAllSettings(): AppSettings {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as SettingRow[]
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return {
    theme: (map['theme'] ?? 'system') as Theme,
    summaryBarVisible: (map['summary_bar_visible'] ?? 'true') === 'true',
    defaultDateRange: (map['default_date_range'] ?? 'current_month') as DefaultDateRange,
    sidebarCollapsed: (map['sidebar_collapsed'] ?? 'false') === 'true',
  }
}
