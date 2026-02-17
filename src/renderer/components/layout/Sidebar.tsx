import { useAppStore, SidebarView } from '../../stores/app.store'
import { useUiStore } from '../../stores/ui.store'
import { useCards } from '../../hooks/useCards'
import { KbdHint } from '../shared/KbdHint'

interface NavItem {
  icon: string
  label: string
  view: SidebarView
  kbd: string[]
}

const NAV_ITEMS: NavItem[] = [
  { icon: '⊞', label: 'Transactions', view: 'transactions', kbd: ['1'] },
  { icon: '◑', label: 'Insights', view: 'insights', kbd: ['2'] },
  { icon: '↻', label: 'Recurring', view: 'recurring', kbd: ['3'] },
  { icon: '◇', label: 'Goals', view: 'goals', kbd: ['4'] },
  { icon: '▤', label: 'Reports', view: 'reports', kbd: ['5'] },
]

interface SidebarItemProps {
  icon: string
  label: string
  active: boolean
  onClick: () => void
  kbd?: string[]
}

function SidebarItem({ icon, label, active, onClick, kbd }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-[10px] w-full px-[12px] py-[8px] rounded-[6px] text-[13px] transition-all duration-[150ms] text-left
        ${active
          ? 'bg-[var(--color-bg-hover)] text-[var(--color-text)] font-[560]'
          : 'text-[var(--color-text-secondary)] font-[440] hover:bg-[var(--color-bg-hover)]'
        }`}
    >
      <span className="text-[16px] w-[20px] text-center opacity-70">{icon}</span>
      <span className="flex-1">{label}</span>
      {kbd && <KbdHint keys={kbd} />}
    </button>
  )
}

export function Sidebar() {
  const { activeView, setActiveView, selectedCardId, setSelectedCardId } = useAppStore()
  const { toggleShortcutsOverlay } = useUiStore()
  const { cards } = useCards()

  return (
    <div className="w-sidebar min-w-sidebar h-screen flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-panel)] px-[10px] py-[16px]">
      {/* App Title */}
      <div className="flex items-center gap-[9px] px-[12px] pb-[20px] pt-[4px]">
        <div className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center text-[13px] text-white font-[700]"
          style={{ background: 'linear-gradient(135deg, var(--color-accent), #7C3AED)' }}>
          $
        </div>
        <span className="text-[14px] font-[650] text-[var(--color-text)] tracking-[-0.02em]">SpendLens</span>
        <span className="text-[9px] font-[600] text-[var(--color-accent)] bg-[var(--color-accent-subtle)] px-[6px] py-[2px] rounded-[4px] ml-[2px] tracking-[0.04em]">
          BETA
        </span>
      </div>

      {/* Card Selector */}
      <div className="px-[6px] pb-[16px]">
        <select
          value={selectedCardId ?? 'all'}
          onChange={(e) => setSelectedCardId(e.target.value === 'all' ? null : Number(e.target.value))}
          className="w-full px-[10px] py-[7px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] cursor-pointer appearance-none"
        >
          <option value="all">All Cards</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-[2px]">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            active={activeView === item.view}
            onClick={() => setActiveView(item.view)}
            kbd={item.kbd}
          />
        ))}
      </div>

      <div className="flex-1" />

      {/* Bottom: Settings + Shortcuts */}
      <div className="border-t border-[var(--color-border)] pt-[10px] flex flex-col gap-[2px]">
        <SidebarItem
          icon="⚙"
          label="Settings"
          active={activeView === 'settings'}
          onClick={() => setActiveView('settings')}
        />
        <SidebarItem
          icon="?"
          label="Shortcuts"
          active={false}
          onClick={toggleShortcutsOverlay}
          kbd={['?']}
        />
      </div>
    </div>
  )
}
