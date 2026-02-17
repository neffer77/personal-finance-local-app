import { useState } from 'react'
import { useSubscriptions } from '../../hooks/useSubscriptions'
import { StatCard } from '../shared/StatCard'
import { EmptyState } from '../shared/EmptyState'
import { formatCents } from '../../lib/format'
import type { SubscriptionWithCost } from '../../../shared/types'

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

// ============================================================================
// Sub-components
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

interface SubscriptionRowProps {
  sub: SubscriptionWithCost
  onSetReviewDate: (sub: SubscriptionWithCost) => void
  onArchive: (id: number) => void
}

function SubscriptionRow({ sub, onSetReviewDate, onArchive }: SubscriptionRowProps) {
  const overdue = isReviewOverdue(sub.reviewDate)
  const monthlyCents = (() => {
    if (!sub.estimatedAmountCents) return null
    switch (sub.billingCycle) {
      case 'weekly':    return Math.round(sub.estimatedAmountCents * 52 / 12)
      case 'monthly':   return sub.estimatedAmountCents
      case 'quarterly': return Math.round(sub.estimatedAmountCents / 3)
      case 'annual':    return Math.round(sub.estimatedAmountCents / 12)
    }
  })()

  return (
    <div className={`flex items-center gap-[16px] px-[20px] py-[14px] border-b border-[var(--color-border)] transition-colors ${
      sub.isActive ? 'hover:bg-[var(--color-bg-hover)]' : 'opacity-50'
    }`}>
      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] mb-[3px]">
          <span className="text-[13px] font-[560] text-[var(--color-text)] truncate">
            {sub.name}
          </span>
          {!sub.isActive && (
            <span className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[4px] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] tracking-[0.04em]">
              INACTIVE
            </span>
          )}
          {overdue && (
            <span className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[4px] bg-[#FEF3C7] text-[#92400E] dark:bg-[#451a03] dark:text-[#FDE68A] tracking-[0.04em]">
              REVIEW DUE
            </span>
          )}
        </div>
        <div className="flex items-center gap-[10px] text-[11px] text-[var(--color-text-tertiary)]">
          <span>{durationLabel(sub.firstSeenDate, sub.lastSeenDate)}</span>
          {sub.categoryName && (
            <>
              <span>·</span>
              <span>{sub.categoryName}</span>
            </>
          )}
          {sub.reviewDate && !overdue && (
            <>
              <span>·</span>
              <span>Review by {sub.reviewDate}</span>
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

      {/* Monthly cost */}
      <div className="w-[90px] text-right">
        <div className="text-[13px] font-[600] tabular-nums text-[var(--color-text)]">
          {monthlyCents != null ? formatCents(monthlyCents) : '—'}<span className="text-[11px] font-[400] text-[var(--color-text-tertiary)]">/mo</span>
        </div>
        {sub.annualCostCents != null && (
          <div className="text-[11px] text-[var(--color-text-tertiary)] tabular-nums">
            {formatCents(sub.annualCostCents)}/yr
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
  const { subscriptions, loading, detecting, error, detect, update, archive } = useSubscriptions()
  const [reviewTarget, setReviewTarget] = useState<SubscriptionWithCost | null>(null)
  const [detectResult, setDetectResult] = useState<{ created: number; updated: number } | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const active = subscriptions.filter((s) => s.isActive)
  const inactive = subscriptions.filter((s) => !s.isActive)
  const visible = showInactive ? subscriptions : active

  // Summary stats
  const totalMonthlyCents = active.reduce((sum, s) => {
    if (!s.estimatedAmountCents) return sum
    switch (s.billingCycle) {
      case 'weekly':    return sum + Math.round(s.estimatedAmountCents * 52 / 12)
      case 'monthly':   return sum + s.estimatedAmountCents
      case 'quarterly': return sum + Math.round(s.estimatedAmountCents / 3)
      case 'annual':    return sum + Math.round(s.estimatedAmountCents / 12)
      default:          return sum
    }
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
        <button
          onClick={handleDetect}
          disabled={detecting}
          className="flex items-center gap-[7px] px-[14px] py-[8px] rounded-[7px] text-[13px] font-[560] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <span className={detecting ? 'animate-spin inline-block' : ''}>↻</span>
          {detecting ? 'Detecting…' : 'Detect subscriptions'}
        </button>
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
          description='Import transactions and click "Detect subscriptions" to find recurring charges automatically.'
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
            <div className="w-[90px] text-right text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase">
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
    </div>
  )
}
