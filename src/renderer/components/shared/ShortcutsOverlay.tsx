import { useUiStore } from '../../stores/ui.store'

const SHORTCUTS = [
  { key: '1 – 5', description: 'Switch sidebar views' },
  { key: '/', description: 'Focus search' },
  { key: 'Escape', description: 'Close side panel / deselect' },
  { key: 'j / k', description: 'Navigate table rows down / up' },
  { key: 'Enter', description: 'Open detail for selected row' },
  { key: '⌘ I', description: 'Open import dialog' },
  { key: '⌘ F', description: 'Focus search (alias for /)' },
  { key: '?', description: 'Toggle this overlay' },
]

export function ShortcutsOverlay() {
  const { shortcutsOverlayOpen, toggleShortcutsOverlay } = useUiStore()

  if (!shortcutsOverlayOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={toggleShortcutsOverlay}
    >
      <div
        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[10px] p-[24px] w-[400px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-[18px]">
          <span className="text-[13px] font-[620] text-[var(--color-text)]">Keyboard Shortcuts</span>
          <button
            onClick={toggleShortcutsOverlay}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] w-[24px] h-[24px] flex items-center justify-center rounded-[4px] hover:bg-[var(--color-bg-hover)] text-[16px] leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-[8px]">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-[6px] border-b border-[var(--color-border-subtle)] last:border-0"
            >
              <span className="text-[12px] text-[var(--color-text-secondary)]">{s.description}</span>
              <kbd className="font-mono text-[10px] px-[8px] py-[3px] rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
