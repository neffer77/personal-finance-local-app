import { useState, useRef, useEffect } from 'react'
import { useSubscriptions } from '../../hooks/useSubscriptions'
import { StatCard } from '../shared/StatCard'
import { EmptyState } from '../shared/EmptyState'
import { formatCents } from '../../lib/format'
import type { BillingCycle, SubscriptionWithCost } from '../../../shared/types'

// ============================================================================
// Helpers
// ============================================================================

const CYCLE_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

const CYCLE_COLOR: Record<string, string> = {
  weekly: 'var(--color-accent)',
  monthly: '#16A34A',
  quarterly: '#D97706',
  annual: '#7C3AED',
}

const BILLING_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'annual']

/** Effective per-charge amount, respecting manual override */
function effectiveAmountCents(sub: SubscriptionWithCost): number | null {
  return sub.manualOverrideAmountCents ?? sub.estimatedAmountCents
}

/** Normalize any per-charge amount to a monthly equivalent */
function toMonthlyCents(amountCents: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly':    return Math.round(amountCents * 52 / 12)
    case 'monthly':   return amountCents
    case 'quarterly': return Math.round(amountCents / 3)
    case 'annual':    return Math.round(amountCents / 12)
  }
}

function durationLabel(firstSeen: string | null, lastSeen: string | null): string {
  if (!firstSeen || !lastSeen) return '—'
  const first = new Date(firstSeen).getTime()
  const last = new Date(lastSeen).getTime()
  const months = Math.round((last - first) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return '< 1 month'
  if (months === 1) return '1 month'
  if (months < 12) return `${months} months`
  const years = (months / 12).toFixed(1)
  return `${years} yrs`
}

function isReviewOverdue(reviewDate: string | null): boolean {
  if (!reviewDate) return false
  return new Date(reviewDate) <= new Date()
}

/** Parse a dollar string like "12.99" → integer cents. Returns null if invalid. */
function parseDollarsToCents(value: string): number | null {
  const n = parseFloat(value.replace(/[$,]/g, ''))
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

// ============================================================================
// ReviewDateModal
// ============================================================================

interface ReviewDateModalProps {
  subscription: SubscriptionWithCost
  onSave: (date: string | null) => void
  onClose: () => void
}

function ReviewDateModal({ subscription, onSave, onClose }: ReviewDateModalProps) {
  const [value, setValue] = useState(subscription.reviewDate ?? '')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[12px] shadow-2xl p-[24px] w-[360px]">
        <h3 className="text-[14px] font-[650] text-[var(--color-text)] mb-[4px]">
          Set review date
        </h3>
        <p className="text-[12px] text-[var(--color-text-tertiary)] mb-[16px]">
          {subscription.name} — reminder to review or cancel.
        </p>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-[10px] py-[8px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] mb-[16px]"
        />
        <div className="flex gap-[8px] justify-end">
          {subscription.reviewDate && (
            <button
              onClick={() => { onSave(null); onClose() }}
              className="px-[12px] py-[6px] text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="px-[12px] py-[6px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(value || null); onClose() }}
            className="px-[14px] py-[6px] rounded-[6px] text-[12px] font-[560] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AddSubscriptionModal
// ============================================================================

interface AddSubscriptionModalProps {
  onSave: (name: string, amountCents: number, cycle: BillingCycle, notes: string | null) => Promise<void>
  onClose: () => void
}

function AddSubscriptionModal({ onSave, onClose }: AddSubscriptionModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) { setValidationError('Name is required'); return }
    const cents = parseDollarsToCents(amount)
    if (cents === null || cents === 0) { setValidationError('Enter a valid amount greater than $0'); return }
    setValidationError(null)
    setSaving(true)
    try {
      await onSave(trimmedName, cents, cycle, notes.trim() || null)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[12px] shadow-2xl p-[24px] w-[420px]"
        onKeyDown={handleKeyDown}
      >
        <h3 className="text-[14px] font-[650] text-[var(--color-text)] mb-[4px]">
          Add subscription
        </h3>
        <p className="text-[12px] text-[var(--color-text-tertiary)] mb-[20px]">
          Manually track a subscription not auto-detected from your transactions.
        </p>

        {/* Name */}
        <label className="block mb-[14px]">
          <span className="text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase block mb-[6px]">
            Name
          </span>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Netflix, Spotify"
            className="w-full px-[10px] py-[8px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        {/* Amount + Cycle on one row */}
        <div className="flex gap-[10px] mb-[14px]">
          <label className="flex-1">
            <span className="text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase block mb-[6px]">
              Amount
            </span>
            <div className="relative">
              <span className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[13px] text-[var(--color-text-tertiary)]">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-[22px] pr-[10px] py-[8px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </label>

          <label className="w-[140px]">
            <span className="text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase block mb-[6px]">
              Billing cycle
            </span>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value as BillingCycle)}
              className="w-full px-[10px] py-[8px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] outline-none focus:border-[var(--color-accent)]"
            >
              {BILLING_CYCLES.map((c) => (
                <option key={c} value={c}>{CYCLE_LABEL[c]}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Notes (optional) */}
        <label className="block mb-[20px]">
          <span className="text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase block mb-[6px]">
            Notes <span className="font-[400] normal-case">(optional)</span>
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. shared with partner"
            className="w-full px-[10px] py-[8px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        {/* Validation error */}
        {validationError && (
          <p className="text-[12px] text-red-500 mb-[14px] -mt-[10px]">{validationError}</p>
        )}

        <div className="flex gap-[8px] justify-end">
          <button
            onClick={onClose}
            className="px-[12px] py-[6px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-[14px] py-[6px] rounded-[6px] text-[12px] font-[560] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Add subscription'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SubscriptionRow
// ============================================================================

interface SubscriptionRowProps {
  sub: SubscriptionWithCost
  onSetReviewDate: (sub: SubscriptionWithCost) => void
  onEditAmount: (id: number, newCents: number) => Promise<void>
  onResetOverride: (id: number) => Promise<void>
  onArchive: (id: number) => Promise<void>
}

function SubscriptionRow({ sub, onSetReviewDate, onEditAmount, onResetOverride, onArchive }: SubscriptionRowProps) {
  const [editingAmount, setEditingAmount] = useState(false)
  const [amountDraft, setAmountDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const overdue = isReviewOverdue(sub.reviewDate)
  const effectiveCents = effectiveAmountCents(sub)
  const monthlyCents = effectiveCents != null ? toMonthlyCents(effectiveCents, sub.billingCycle) : null
  const isEdited = sub.manualOverrideAmountCents != null
  const isManual = sub.isManual

  const startEdit = () => {
    const current = effectiveCents != null ? (effectiveCents / 100).toFixed(2) : ''
    setAmountDraft(current)
    setEditingAmount(true)
    // Focus after render
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const cancelEdit = () => {
    setEditingAmount(false)
    setAmountDraft('')
  }

  const saveEdit = async () => {
    const cents = parseDollarsToCents(amountDraft)
    if (cents === null || cents === 0) { cancelEdit(); return }
    // No-op if unchanged
    if (cents === effectiveCents) { cancelEdit(); return }
    setSaving(true)
    try {
      await onEditAmount(sub.id, cents)
      setEditingAmount(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className={`flex items-center gap-[16px] px-[20px] py-[14px] border-b border-[var(--color-border)] transition-colors ${
      sub.isActive ? 'hover:bg-[var(--color-bg-hover)]' : 'opacity-50'
    }`}>
      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] mb-[3px] flex-wrap">
          <span className="text-[13px] font-[560] text-[var(--color-text)] truncate">
            {sub.name}
          </span>
          {!sub.isActive && (
            <span className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[4px] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] tracking-[0.04em]">
              INACTIVE
            </span>
          )}
          {isManual && (
            <span className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[4px] bg-[#7C3AED]/12 text-[#7C3AED] dark:text-[#A78BFA] tracking-[0.04em]">
              MANUAL
            </span>
          )}
          {isEdited && !isManual && (
            <span className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[4px] bg-[var(--color-accent)]/12 text-[var(--color-accent)] tracking-[0.04em]">
              EDITED
            </span>
          )}
          {overdue && (
            <span className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[4px] bg-[#FEF3C7] text-[#92400E] dark:bg-[#451a03] dark:text-[#FDE68A] tracking-[0.04em]">
              REVIEW DUE
            </span>
          )}
        </div>
        <div className="flex items-center gap-[10px] text-[11px] text-[var(--color-text-tertiary)]">
          {!isManual && <span>{durationLabel(sub.firstSeenDate, sub.lastSeenDate)}</span>}
          {sub.categoryName && (
            <>
              {!isManual && <span>·</span>}
              <span>{sub.categoryName}</span>
            </>
          )}
          {sub.reviewDate && !overdue && (
            <>
              <span>·</span>
              <span>Review by {sub.reviewDate}</span>
            </>
          )}
          {sub.notes && (
            <>
              <span>·</span>
              <span className="truncate max-w-[160px]">{sub.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Cadence badge */}
      <div
        className="text-[10px] font-[650] px-[8px] py-[3px] rounded-[5px] tracking-[0.04em] whitespace-nowrap"
        style={{
          color: CYCLE_COLOR[sub.billingCycle] ?? 'var(--color-text-secondary)',
          background: `${CYCLE_COLOR[sub.billingCycle] ?? 'transparent'}18`,
        }}
      >
        {CYCLE_LABEL[sub.billingCycle] ?? sub.billingCycle}
      </div>

      {/* Monthly cost — with inline edit */}
      <div className="w-[110px] text-right flex-shrink-0">
        {editingAmount ? (
          <div className="flex items-center gap-[4px] justify-end">
            <span className="text-[12px] text-[var(--color-text-tertiary)]">$</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={amountDraft}
              onChange={(e) => setAmountDraft(e.target.value)}
              onKeyDown={handleAmountKeyDown}
              onBlur={saveEdit}
              disabled={saving}
              className="w-[68px] px-[6px] py-[3px] rounded-[5px] border border-[var(--color-accent)] bg-[var(--color-bg-subtle)] text-[13px] font-[600] tabular-nums text-[var(--color-text)] text-right outline-none"
              autoFocus
            />
          </div>
        ) : (
          <div className="group flex items-center justify-end gap-[4px]">
            {/* Reset override button — only shown when overridden */}
            {isEdited && (
              <button
                onClick={(e) => { e.stopPropagation(); onResetOverride(sub.id) }}
                title={`Reset to auto-detected (${sub.estimatedAmountCents != null ? formatCents(sub.estimatedAmountCents) : '—'})`}
                className="opacity-0 group-hover:opacity-100 w-[18px] h-[18px] flex items-center justify-center rounded-[4px] text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-all"
              >
                ↺
              </button>
            )}
            <button
              onClick={startEdit}
              title="Edit amount"
              className="text-right"
            >
              <div className="text-[13px] font-[600] tabular-nums text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors">
                {monthlyCents != null ? formatCents(monthlyCents) : '—'}
                <span className="text-[11px] font-[400] text-[var(--color-text-tertiary)]">/mo</span>
              </div>
              {sub.annualCostCents != null && (
                <div className="text-[11px] text-[var(--color-text-tertiary)] tabular-nums">
                  {formatCents(sub.annualCostCents)}/yr
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[4px] ml-[4px]">
        <button
          onClick={() => onSetReviewDate(sub)}
          title="Set review date"
          className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[13px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors"
        >
          ◔
        </button>
        {sub.isActive && (
          <button
            onClick={() => onArchive(sub.id)}
            title="Mark as cancelled"
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[13px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main view
// ============================================================================

export function RecurringView() {
  const { subscriptions, loading, detecting, error, detect, create, update, resetOverride, archive } = useSubscriptions()
  const [reviewTarget, setReviewTarget] = useState<SubscriptionWithCost | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [detectResult, setDetectResult] = useState<{ created: number; updated: number } | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const active = subscriptions.filter((s) => s.isActive)
  const inactive = subscriptions.filter((s) => !s.isActive)
  const visible = showInactive ? subscriptions : active

  // Summary stats — use effective amount (respects override)
  const totalMonthlyCents = active.reduce((sum, s) => {
    const cents = effectiveAmountCents(s)
    if (cents == null) return sum
    return sum + toMonthlyCents(cents, s.billingCycle)
  }, 0)
  const totalAnnualCents = active.reduce((sum, s) => sum + (s.annualCostCents ?? 0), 0)
  const overdueCount = active.filter((s) => isReviewOverdue(s.reviewDate)).length

  const handleDetect = async () => {
    try {
      const result = await detect()
      setDetectResult(result)
    } catch {
      // error state handled by hook
    }
  }

  const handleSaveReviewDate = async (date: string | null) => {
    if (!reviewTarget) return
    await update({ id: reviewTarget.id, reviewDate: date })
  }

  const handleAddSubscription = async (
    name: string,
    amountCents: number,
    cycle: BillingCycle,
    notes: string | null,
  ) => {
    await create({ name, estimatedAmountCents: amountCents, billingCycle: cycle, notes })
  }

  const handleEditAmount = async (id: number, newCents: number) => {
    await update({ id, manualOverrideAmountCents: newCents })
  }

  return (
    <div className="flex-1 p-[28px] overflow-y-auto h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-[24px]">
        <div>
          <h2 className="text-[20px] font-[650] text-[var(--color-text)] tracking-[-0.02em] mb-[4px]">
            Recurring Charges
          </h2>
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            Auto-detected subscriptions and recurring payments from your transactions.
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[7px] text-[13px] font-[560] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors"
          >
            + Add
          </button>
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="flex items-center gap-[7px] px-[14px] py-[8px] rounded-[7px] text-[13px] font-[560] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <span className={detecting ? 'animate-spin inline-block' : ''}>↻</span>
            {detecting ? 'Detecting…' : 'Detect subscriptions'}
          </button>
        </div>
      </div>

      {/* Detection result toast */}
      {detectResult && (
        <div className="mb-[20px] px-[14px] py-[10px] rounded-[8px] border border-[#16A34A]/30 bg-[#16A34A]/8 text-[12px] text-[#16A34A] flex items-center justify-between">
          <span>
            Found {detectResult.created} new · updated {detectResult.updated} existing
          </span>
          <button
            onClick={() => setDetectResult(null)}
            className="text-[14px] opacity-60 hover:opacity-100 ml-[12px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-[20px] px-[14px] py-[10px] rounded-[8px] border border-red-500/30 bg-red-500/8 text-[12px] text-red-500">
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="flex gap-[12px] mb-[28px]">
        <StatCard
          label="Active subscriptions"
          value={String(active.length)}
          sub={inactive.length > 0 ? { text: `${inactive.length} inactive` } : undefined}
        />
        <StatCard
          label="Monthly total"
          value={formatCents(totalMonthlyCents)}
          sub={{ text: 'estimated' }}
        />
        <StatCard
          label="Annual total"
          value={formatCents(totalAnnualCents)}
          sub={{ text: 'estimated' }}
        />
        {overdueCount > 0 && (
          <StatCard
            label="Reviews overdue"
            value={String(overdueCount)}
            valueColor="#D97706"
            sub={{ text: 'need attention', color: '#D97706' }}
          />
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-[60px] text-[13px] text-[var(--color-text-tertiary)]">
          Loading…
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          title="No recurring charges detected"
          description='Import transactions and click "Detect subscriptions" to find recurring charges automatically, or add one manually with "+ Add".'
        />
      ) : (
        <div className="rounded-[10px] border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-card)]">
          {/* Table header */}
          <div className="flex items-center gap-[16px] px-[20px] py-[10px] border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <div className="flex-1 text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase">
              Merchant
            </div>
            <div className="w-[80px] text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase">
              Cadence
            </div>
            <div className="w-[110px] text-right text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase">
              Cost
            </div>
            <div className="w-[60px]" />
          </div>

          {visible.length === 0 ? (
            <div className="px-[20px] py-[32px] text-center text-[13px] text-[var(--color-text-tertiary)]">
              No active subscriptions
            </div>
          ) : (
            visible.map((sub) => (
              <SubscriptionRow
                key={sub.id}
                sub={sub}
                onSetReviewDate={setReviewTarget}
                onEditAmount={handleEditAmount}
                onResetOverride={resetOverride}
                onArchive={archive}
              />
            ))
          )}
        </div>
      )}

      {/* Show/hide inactive toggle */}
      {inactive.length > 0 && (
        <button
          onClick={() => setShowInactive((v) => !v)}
          className="mt-[16px] text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors"
        >
          {showInactive ? 'Hide' : 'Show'} {inactive.length} inactive
        </button>
      )}

      {/* Review date modal */}
      {reviewTarget && (
        <ReviewDateModal
          subscription={reviewTarget}
          onSave={handleSaveReviewDate}
          onClose={() => setReviewTarget(null)}
        />
      )}

      {/* Add subscription modal */}
      {showAddModal && (
        <AddSubscriptionModal
          onSave={handleAddSubscription}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
