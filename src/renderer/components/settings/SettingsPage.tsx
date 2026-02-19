import { useSettings } from '../../hooks/useSettings'
import { useCards } from '../../hooks/useCards'
import { backupApi } from '../../api/backup'
import { useState } from 'react'
import type { Theme } from '../../../shared/types'

export function SettingsPage() {
  const { settings, updateSetting } = useSettings()
  const { cards, createCard } = useCards()
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [newCardOwner, setNewCardOwner] = useState('')
  const [addCardError, setAddCardError] = useState<string | null>(null)

  const handleThemeChange = async (theme: Theme) => {
    await updateSetting({ key: 'theme', value: theme })
  }

  const handleBackup = async () => {
    try {
      const result = await backupApi.create()
      setBackupStatus(`Backup saved to: ${result.path}`)
    } catch (err) {
      setBackupStatus(`Backup failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleAddCard = async () => {
    if (!newCardName || !newCardOwner) return
    setAddCardError(null)
    try {
      await createCard({ name: newCardName, owner: newCardOwner })
      setNewCardName('')
      setNewCardOwner('')
      setShowAddCard(false)
    } catch (err) {
      setAddCardError(err instanceof Error ? err.message : 'Failed to add card')
    }
  }

  const theme = settings?.theme ?? 'system'

  return (
    <div className="p-[28px] overflow-y-auto h-screen max-w-[560px]">
      <h2 className="text-[20px] font-[650] text-[var(--color-text)] tracking-[-0.02em] mb-[24px]">
        Settings
      </h2>

      {/* Theme */}
      <section className="mb-[32px]">
        <div className="text-[13px] font-[600] text-[var(--color-text)] mb-[10px]">Appearance</div>
        <div className="flex gap-[8px]">
          {(['light', 'dark', 'system'] as Theme[]).map((opt) => (
            <button
              key={opt}
              onClick={() => handleThemeChange(opt)}
              className={`flex-1 px-[14px] py-[10px] rounded-[8px] text-[12px] font-[530] cursor-pointer capitalize transition-all border
                ${theme === opt
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)]'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      {/* Cards */}
      <section className="mb-[32px]">
        <div className="text-[13px] font-[600] text-[var(--color-text)] mb-[10px]">Cards</div>
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[8px] overflow-hidden">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="flex items-center justify-between px-[16px] py-[12px]"
              style={{ borderBottom: i < cards.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}
            >
              <div>
                <div className="text-[13px] font-[520] text-[var(--color-text)]">{card.name}</div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">
                  {card.lastFour ? `•••• ${card.lastFour} · ` : ''}{card.issuer}
                </div>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <div className="px-[16px] py-[12px] text-[12px] text-[var(--color-text-tertiary)]">
              No cards yet
            </div>
          )}
        </div>

        {showAddCard ? (
          <div className="mt-[8px] flex flex-col gap-[8px] p-[12px] border border-[var(--color-border)] rounded-[8px] bg-[var(--color-bg-subtle)]">
            <input
              value={newCardName}
              onChange={(e) => setNewCardName(e.target.value)}
              placeholder="Card name (e.g. Connor's Sapphire)"
              className="px-[10px] py-[7px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[12px] outline-none focus:border-[var(--color-accent)]"
            />
            <input
              value={newCardOwner}
              onChange={(e) => setNewCardOwner(e.target.value)}
              placeholder="Owner name (e.g. Connor)"
              className="px-[10px] py-[7px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-[12px] outline-none focus:border-[var(--color-accent)]"
            />
            {addCardError && (
              <div className="text-[11px] text-red-500">{addCardError}</div>
            )}
            <div className="flex gap-[8px]">
              <button
                onClick={handleAddCard}
                disabled={!newCardName || !newCardOwner}
                className="flex-1 py-[7px] rounded-[6px] text-[12px] font-[550] bg-[var(--color-accent)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
              >
                Add Card
              </button>
              <button
                onClick={() => { setShowAddCard(false); setAddCardError(null) }}
                className="px-[14px] py-[7px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-transparent cursor-pointer hover:bg-[var(--color-bg-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="mt-[8px] text-[12px] text-[var(--color-accent)] font-[550] bg-transparent border-none cursor-pointer hover:opacity-80 py-[4px]"
          >
            + Add Card
          </button>
        )}
      </section>

      {/* Data / Backup */}
      <section>
        <div className="text-[13px] font-[600] text-[var(--color-text)] mb-[10px]">Data</div>
        <div className="flex gap-[8px]">
          <button
            onClick={handleBackup}
            className="px-[16px] py-[9px] rounded-[6px] text-[12px] font-[550] border border-[var(--color-border)] bg-transparent text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            Back Up Database
          </button>
        </div>
        {backupStatus && (
          <div className="mt-[8px] text-[11px] text-[var(--color-text-secondary)]">{backupStatus}</div>
        )}
      </section>
    </div>
  )
}
