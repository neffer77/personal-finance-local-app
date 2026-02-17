import { useFilterStore } from '../../stores/filter.store'
import { useUiStore } from '../../stores/ui.store'
import { KbdHint } from '../shared/KbdHint'

export function Toolbar() {
  const { search, setSearch } = useFilterStore()
  const { openImportModal } = useUiStore()

  return (
    <div className="flex items-center gap-[10px] px-[28px] py-[12px] border-b border-[var(--color-border)]">
      {/* Search */}
      <div className="flex items-center gap-[8px] flex-1 max-w-[320px] px-[12px] py-[7px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <span className="text-[var(--color-text-tertiary)] text-[13px]">⌕</span>
        <input
          data-search-input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="border-none bg-transparent outline-none text-[12px] text-[var(--color-text)] flex-1 placeholder:text-[var(--color-text-tertiary)]"
        />
        <KbdHint keys={['/']} />
      </div>

      <div className="flex-1" />

      {/* Import Button */}
      <button
        onClick={openImportModal}
        className="flex items-center gap-[6px] px-[14px] py-[7px] rounded-[6px] text-[12px] font-[570] bg-[var(--color-accent)] text-white border-none cursor-pointer transition-opacity hover:opacity-90"
      >
        ↑ Import CSV
        <KbdHint
          keys={['⌘', 'I']}
          className="!opacity-100 [&>span]:border-white/20 [&>span]:bg-white/10 [&>span]:text-white/70"
        />
      </button>
    </div>
  )
}
