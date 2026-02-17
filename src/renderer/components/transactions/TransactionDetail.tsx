import { useState } from 'react'
import { AmountDisplay } from '../shared/AmountDisplay'
import { formatDate } from '../../lib/format'
import { transactionsApi } from '../../api/transactions'
import { useCategories } from '../../hooks/useCategories'
import type { EnrichedTransaction } from '../../../shared/types'

interface TransactionDetailProps {
  transaction: EnrichedTransaction
  onClose: () => void
  onUpdated: (tx: EnrichedTransaction) => void
}

export function TransactionDetail({ transaction: tx, onClose, onUpdated }: TransactionDetailProps) {
  const { categories } = useCategories()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState(tx.notes ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(tx.categoryId)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await transactionsApi.update({
        id: tx.id,
        categoryId,
        notes: notes || null,
      })
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-side-panel min-w-side-panel border-l border-[var(--color-border)] bg-[var(--color-bg-panel)] h-screen overflow-y-auto animate-slide-in flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-[20px] py-[18px] border-b border-[var(--color-border)] flex-shrink-0">
        <span className="text-[12px] font-[600] text-[var(--color-text-secondary)] tracking-[0.03em] uppercase">
          Transaction Detail
        </span>
        <button
          onClick={onClose}
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] w-[28px] h-[28px] rounded-[4px] flex items-center justify-center text-[18px] leading-none transition-all"
        >
          ×
        </button>
      </div>

      <div className="p-[20px] flex flex-col gap-[16px] flex-1">
        {/* Amount */}
        <div className="text-center mb-[8px]">
          <AmountDisplay cents={tx.amountCents} showPlus className="text-[32px] font-[700] tracking-[-0.03em]" />
          <div className="text-[12px] text-[var(--color-text-tertiary)] mt-[4px]">
            {tx.isReturn ? 'Credit / Return' : 'Purchase'}
          </div>
        </div>

        {/* Fields */}
        {[
          { label: 'Merchant', value: tx.effectiveName },
          { label: 'Raw Description', value: tx.description, mono: true },
          { label: 'Date', value: formatDate(tx.transactionDate) },
          { label: 'Posted', value: formatDate(tx.postedDate) },
          { label: 'Card', value: tx.cardName },
          { label: 'Type', value: tx.type },
        ].map(({ label, value, mono }) => (
          <div key={label}>
            <div className="text-[10px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.06em] uppercase mb-[5px]">
              {label}
            </div>
            <div className={`text-[${mono ? '11px' : '13px'}] text-[var(--color-text)] ${mono ? 'font-mono' : ''}`}>
              {value}
            </div>
          </div>
        ))}

        {/* Category (editable) */}
        <div>
          <div className="text-[10px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.06em] uppercase mb-[5px]">
            Category
          </div>
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-[10px] py-[7px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] cursor-pointer"
          >
            <option value="">— Use original —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {tx.categoryId && (
            <div className="text-[11px] text-[var(--color-accent)] mt-[4px]">Override active</div>
          )}
          {!tx.categoryId && (
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-[4px]">
              Original: {tx.originalCategory || '—'}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <div className="text-[10px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.06em] uppercase mb-[5px]">
            Notes
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="w-full px-[10px] py-[8px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[12px] resize-vertical placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-[12px] text-[var(--color-red)]">{error}</div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-[9px] rounded-[6px] text-[12px] font-[550] bg-[var(--color-accent)] text-white border-none cursor-pointer hover:opacity-90 disabled:opacity-60 transition-opacity mt-[4px]"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
