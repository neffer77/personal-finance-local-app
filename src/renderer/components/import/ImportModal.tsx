import { useState, useEffect } from 'react'
import { Modal } from '../shared/Modal'
import { DropZone } from './DropZone'
import { ImportSummary } from './ImportSummary'
import { useUiStore } from '../../stores/ui.store'
import { useCards } from '../../hooks/useCards'
import { importsApi } from '../../api/imports'
import type { ImportResult } from '../../../shared/types'

export function ImportModal() {
  const { closeImportModal } = useUiStore()
  const { cards } = useCards()
  const [filePath, setFilePath] = useState<string | null>(null)
  const [cardId, setCardId] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-select first card when cards load
  useEffect(() => {
    if (cards.length > 0 && !cardId) {
      setCardId(cards[0].id)
    }
  }, [cards, cardId])

  const handleImport = async () => {
    if (!filePath || !cardId) return
    setImporting(true)
    setError(null)
    try {
      const importResult = await importsApi.importCSV({ filePath, cardId })
      setResult(importResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleDone = () => {
    closeImportModal()
    // Force a page reload to refresh transaction list
    window.location.reload()
  }

  return (
    <Modal title="Import CSV" onClose={closeImportModal}>
      {result ? (
        <ImportSummary result={result} onDone={handleDone} />
      ) : (
        <div className="flex flex-col gap-[16px]">
          <DropZone
            onFileSelected={setFilePath}
            disabled={importing}
          />

          {filePath && (
            <div className="text-[12px] text-[var(--color-text-secondary)] truncate">
              Selected: <span className="font-[560] text-[var(--color-text)]">{filePath.split('/').pop()}</span>
            </div>
          )}

          {/* Card selector */}
          {cards.length > 0 ? (
            <div>
              <label className="block text-[10px] font-[600] text-[var(--color-text-tertiary)] uppercase tracking-[0.06em] mb-[6px]">
                Assign to Card
              </label>
              <select
                value={cardId ?? ''}
                onChange={(e) => setCardId(Number(e.target.value))}
                className="w-full px-[10px] py-[8px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] cursor-pointer"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>{card.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-[12px] text-[var(--color-orange)]">
              No cards found. Add a card in Settings before importing.
            </div>
          )}

          {error && (
            <div className="text-[12px] text-[var(--color-red)]">{error}</div>
          )}

          <button
            onClick={handleImport}
            disabled={!filePath || !cardId || importing || cards.length === 0}
            className="w-full py-[9px] rounded-[6px] text-[12px] font-[550] bg-[var(--color-accent)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      )}
    </Modal>
  )
}
