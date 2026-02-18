import { useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TransactionsView } from './components/transactions/TransactionsView'
import { InsightsDashboard } from './components/insights/InsightsDashboard'
import { RecurringView } from './components/recurring/RecurringView'
import { GoalsView } from './components/goals/GoalsView'
import { ReportsDashboard } from './components/reports/ReportsDashboard'
import { SettingsPage } from './components/settings/SettingsPage'
import { ImportModal } from './components/import/ImportModal'
import { ShortcutsOverlay } from './components/shared/ShortcutsOverlay'
import { useAppStore } from './stores/app.store'
import { useUiStore } from './stores/ui.store'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSettings } from './hooks/useSettings'
import { EmptyState } from './components/shared/EmptyState'

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex-1 p-[28px] overflow-y-auto h-screen">
      <h2 className="text-[20px] font-[650] text-[var(--color-text)] tracking-[-0.02em] mb-[4px]">{title}</h2>
      <p className="text-[13px] text-[var(--color-text-tertiary)] mb-[28px]">{description}</p>
      <div className="border-2 border-dashed border-[var(--color-border)] rounded-[10px] p-[40px] text-center text-[var(--color-text-tertiary)]">
        <div className="text-[32px] mb-[12px] opacity-30">◇</div>
        <div className="text-[13px] font-[520] mb-[4px]">Coming in a future phase</div>
        <div className="text-[12px]">{description}</div>
      </div>
    </div>
  )
}

export function App() {
  const { activeView } = useAppStore()
  const { importModalOpen } = useUiStore()

  // Register keyboard shortcuts globally
  useKeyboardShortcuts()

  // Load settings and apply theme on mount
  useSettings()

  // Apply system theme preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const stored = document.documentElement.classList.contains('dark')
      if (!stored) {
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'transactions':
        return <TransactionsView />
      case 'insights':
        return <InsightsDashboard />
      case 'recurring':
        return <RecurringView />
      case 'goals':
        return <GoalsView />
      case 'reports':
        return <ReportsDashboard />
      case 'settings':
        return <SettingsPage />
      default:
        return <EmptyState title="Unknown view" />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <Sidebar />
      <main className="flex flex-1 overflow-hidden">
        {renderView()}
      </main>

      {importModalOpen && <ImportModal />}
      <ShortcutsOverlay />
    </div>
  )
}
