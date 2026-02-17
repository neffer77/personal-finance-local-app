import { create } from 'zustand'
import type { Theme } from '../../shared/types'

export type SidebarView = 'transactions' | 'insights' | 'recurring' | 'goals' | 'reports' | 'settings'

interface AppState {
  activeView: SidebarView
  selectedCardId: number | null   // null = all cards
  theme: Theme

  setActiveView: (view: SidebarView) => void
  setSelectedCardId: (id: number | null) => void
  setTheme: (theme: Theme) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'transactions',
  selectedCardId: null,
  theme: 'system',

  setActiveView: (view) => set({ activeView: view }),
  setSelectedCardId: (id) => set({ selectedCardId: id }),
  setTheme: (theme) => {
    set({ theme })
    // Sync <html> class for Tailwind dark mode
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }
  },
}))
