import { useEffect } from 'react'
import { useAppStore } from '../stores/app.store'
import { useUiStore } from '../stores/ui.store'
import { useFilterStore } from '../stores/filter.store'
import type { SidebarView } from '../stores/app.store'

// Returns true if the target is an editable element (suppress shortcuts)
function isEditable(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

export function useKeyboardShortcuts(): void {
  const { setActiveView } = useAppStore()
  const { closeSidePanel, openImportModal, toggleShortcutsOverlay } = useUiStore()
  const { setSearch } = useFilterStore()

  useEffect(() => {
    const VIEW_MAP: Record<string, SidebarView> = {
      '1': 'transactions',
      '2': 'insights',
      '3': 'recurring',
      '4': 'goals',
      '5': 'reports',
    }

    const handler = (e: KeyboardEvent) => {
      // Allow shortcuts in import modal / overlays to pass through
      // but suppress if a text field has focus
      if (isEditable(e.target)) return

      // View switching: 1–5
      if (VIEW_MAP[e.key]) {
        e.preventDefault()
        setActiveView(VIEW_MAP[e.key])
        return
      }

      switch (e.key) {
        case 'Escape':
          closeSidePanel()
          break

        case '/':
          e.preventDefault()
          // Focus the search input
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
          searchInput?.focus()
          break

        case '?':
          e.preventDefault()
          toggleShortcutsOverlay()
          break

        default:
          // Cmd+I or Ctrl+I: open import
          if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
            e.preventDefault()
            openImportModal()
          }
          // Cmd+F or Ctrl+F: focus search
          if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
            e.preventDefault()
            const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
            searchInput?.focus()
          }
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveView, closeSidePanel, openImportModal, toggleShortcutsOverlay, setSearch])
}
