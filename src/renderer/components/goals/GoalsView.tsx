import { useState, useMemo } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { useSnapshots } from '../../hooks/useSnapshots'
import { StatCard } from '../shared/StatCard'
import { EmptyState } from '../shared/EmptyState'
import { formatCents } from '../../lib/format'
import {
  futureValueCents,
  monthsToTarget,
  impactOfSpendCutCents,
  formatMonths,
  projectedDate,
  fireProgress,
} from '../../lib/fire'
import type { Goal, GoalCreate, GoalUpdate } from '../../../shared/types'

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_RETURN_RATE = 0.07
const DEFAULT_TARGET_CENTS = 600_000_000 // $6M in cents

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDollars(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function centsToDisplayDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface GoalFormProps {
  goal: Goal | null
  onSave: (data: GoalCreate | GoalUpdate) => Promise<void>
}

function GoalForm({ goal, onSave }: GoalFormProps) {
  const [name, setName] = useState(goal?.name ?? 'Early Retirement')
  const [targetDollars, setTargetDollars] = useState(
    goal?.targetAmountCents != null
      ? centsToDisplayDollars(goal.targetAmountCents)
      : centsToDisplayDollars(DEFAULT_TARGET_CENTS),
  )
  const [returnRate, setReturnRate] = useState(
    String(((goal?.assumedReturnRate ?? DEFAULT_RETURN_RATE) * 100).toFixed(1)),
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...(goal ? { id: goal.id } : {}),
        name,
        goalType: 'fire' as const,
        targetAmountCents: parseDollars(targetDollars),
        assumedReturnRate: parseFloat(returnRate) / 100,
      }
      await onSave(data as GoalCreate | GoalUpdate)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-[10px] py-[7px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]'

  return (
    <form onSubmit={handleSubmit} className="space-y-[12px]">
      <div>
        <label className="block text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase mb-[5px]">
          Goal name
        </label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex gap-[10px]">
        <div className="flex-1">
          <label className="block text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase mb-[5px]">
            Target ($)
          </label>
          <input
            className={inputClass}
            value={targetDollars}
            onChange={(e) => setTargetDollars(e.target.value)}
            placeholder="6,000,000"
            required
          />
        </div>
        <div className="w-[90px]">
          <label className="block text-[11px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase mb-[5px]">
            Return %
          </label>
          <input
            className={inputClass}
            value={returnRate}
            onChange={(e) => setReturnRate(e.target.value)}
            placeholder="7.0"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-[8px] rounded-[6px] text-[12px] font-[560] bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {saving ? 'Saving…' : goal ? 'Update goal' : 'Set goal'}
      </button>
    </form>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps { pct: number }

function ProgressBar({ pct }: ProgressBarProps) {
  return (
    <div className="w-full h-[8px] rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: pct >= 100
            ? '#16A34A'
            : `linear-gradient(90deg, var(--color-accent), #7C3AED)`,
        }}
      />
    </div>
  )
}

// ── Impact calculator ─────────────────────────────────────────────────────────

interface ImpactCalcProps { annualRate: number }

function ImpactCalculator({ annualRate }: ImpactCalcProps) {
  const [cutDollars, setCutDollars] = useState('100')
  const horizons = [10, 20, 30]

  const cutCents = parseDollars(cutDollars)

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-[20px]">
      <h3 className="text-[13px] font-[650] text-[var(--color-text)] mb-[4px]">
        Impact of a spending cut
      </h3>
      <p className="text-[12px] text-[var(--color-text-tertiary)] mb-[16px]">
        If you redirect this monthly amount into savings:
      </p>
      <div className="flex items-center gap-[10px] mb-[16px]">
        <span className="text-[13px] text-[var(--color-text-secondary)]">$</span>
        <input
          type="number"
          min="0"
          step="10"
          value={cutDollars}
          onChange={(e) => setCutDollars(e.target.value)}
          className="w-[100px] px-[10px] py-[7px] rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-[13px] tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <span className="text-[12px] text-[var(--color-text-tertiary)]">per month</span>
      </div>
      <div className="space-y-[8px]">
        {horizons.map((yrs) => {
          const fv = impactOfSpendCutCents(cutCents, yrs, annualRate)
          return (
            <div key={yrs} className="flex items-center justify-between py-[8px] border-b border-[var(--color-border)] last:border-0">
              <span className="text-[12px] text-[var(--color-text-secondary)]">Over {yrs} years</span>
              <span className="text-[14px] font-[650] tabular-nums text-[var(--color-text)]">
                {formatCents(fv)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-[12px]">
        Assumes {(annualRate * 100).toFixed(1)}% annual return, monthly compounding
      </p>
    </div>
  )
}

// ── Monthly history table ─────────────────────────────────────────────────────

interface SnapshotTableProps {
  snapshots: ReturnType<typeof useSnapshots>['snapshots']
  onUpdateIncome: (month: string, incomeCents: number | null, savingsCents: number | null) => void
}

function SnapshotTable({ snapshots, onUpdateIncome }: SnapshotTableProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [incomeInput, setIncomeInput] = useState('')
  const [savingsInput, setSavingsInput] = useState('')

  const recent = snapshots
    .filter((s) => s.cardId === null)
    .slice(0, 12)

  if (recent.length === 0) return null

  const startEdit = (s: typeof recent[0]) => {
    setEditing(s.month)
    setIncomeInput(s.incomeCents != null ? centsToDisplayDollars(s.incomeCents) : '')
    setSavingsInput(s.savingsCents != null ? centsToDisplayDollars(s.savingsCents) : '')
  }

  const commitEdit = (month: string) => {
    const ic = incomeInput ? parseDollars(incomeInput) : null
    const sc = savingsInput ? parseDollars(savingsInput) : null
    onUpdateIncome(month, ic, sc)
    setEditing(null)
  }

  return (
    <div className="rounded-[10px] border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-card)]">
      <div className="px-[20px] py-[12px] border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <h3 className="text-[12px] font-[650] text-[var(--color-text)]">Monthly history</h3>
        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-[2px]">
          Enter income + savings to track your savings rate
        </p>
      </div>
      {/* Header */}
      <div className="grid grid-cols-[100px_1fr_1fr_1fr_80px_40px] px-[16px] py-[8px] border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        {['Month', 'Spend', 'Income', 'Savings', 'Rate', ''].map((h) => (
          <span key={h} className="text-[10px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase">
            {h}
          </span>
        ))}
      </div>
      {recent.map((s) => {
        const isEditing = editing === s.month
        return (
          <div
            key={s.month}
            className="grid grid-cols-[100px_1fr_1fr_1fr_80px_40px] items-center px-[16px] py-[10px] border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <span className="text-[12px] font-[550] text-[var(--color-text)] tabular-nums">{s.month}</span>
            <span className="text-[12px] tabular-nums text-[var(--color-text-secondary)]">
              {formatCents(s.netSpendCents)}
            </span>
            {isEditing ? (
              <>
                <input
                  autoFocus
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  onBlur={() => commitEdit(s.month)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(s.month); if (e.key === 'Escape') setEditing(null) }}
                  placeholder="0"
                  className="w-[80px] px-[6px] py-[3px] rounded-[4px] border border-[var(--color-accent)] bg-[var(--color-bg-subtle)] text-[12px] tabular-nums text-[var(--color-text)] focus:outline-none"
                />
                <input
                  value={savingsInput}
                  onChange={(e) => setSavingsInput(e.target.value)}
                  onBlur={() => commitEdit(s.month)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(s.month); if (e.key === 'Escape') setEditing(null) }}
                  placeholder="0"
                  className="w-[80px] px-[6px] py-[3px] rounded-[4px] border border-[var(--color-accent)] bg-[var(--color-bg-subtle)] text-[12px] tabular-nums text-[var(--color-text)] focus:outline-none"
                />
              </>
            ) : (
              <>
                <span
                  className="text-[12px] tabular-nums text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text)]"
                  onClick={() => startEdit(s)}
                >
                  {s.incomeCents != null ? formatCents(s.incomeCents) : <span className="opacity-30">—</span>}
                </span>
                <span
                  className="text-[12px] tabular-nums text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text)]"
                  onClick={() => startEdit(s)}
                >
                  {s.savingsCents != null ? formatCents(s.savingsCents) : <span className="opacity-30">—</span>}
                </span>
              </>
            )}
            <span className="text-[12px] tabular-nums font-[550]" style={{
              color: s.savingsRate != null
                ? s.savingsRate >= 0.5 ? '#16A34A' : s.savingsRate >= 0.2 ? '#D97706' : 'var(--color-text-secondary)'
                : 'var(--color-text-tertiary)',
            }}>
              {s.savingsRate != null ? `${(s.savingsRate * 100).toFixed(0)}%` : '—'}
            </span>
            <button
              onClick={() => startEdit(s)}
              className="w-[28px] h-[28px] flex items-center justify-center rounded-[5px] text-[11px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)] transition-colors"
              title="Edit income"
            >
              ✎
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export function GoalsView() {
  const { goals, loading: goalsLoading, error: goalsError, create, update } = useGoals()
  const { snapshots, summary, loading: snapsLoading, updateIncome } = useSnapshots(null)

  // Use the first FIRE goal found, or null if none set yet
  const fireGoal = goals.find((g) => g.goalType === 'fire') ?? null

  const targetCents = fireGoal?.targetAmountCents ?? DEFAULT_TARGET_CENTS
  const annualRate = fireGoal?.assumedReturnRate ?? DEFAULT_RETURN_RATE

  // Derive current savings: user must provide this via income/savings entries.
  // Use avg monthly savings × estimated months of data as a proxy.
  const avgMonthlySavingsCents = summary
    ? Math.max(0, summary.avgMonthlySpendCents > 0
        ? summary.avgMonthlyNetSpendCents > 0
          ? 0 // net spend > 0 means spending more than earning on card — can't derive savings
          : 0  // We don't know portfolio value from card data alone
        : 0)
    : 0

  // FIRE projection numbers — purely illustrative without portfolio value
  const avgMonthlySpend = summary?.avgMonthlySpendCents ?? 0
  const avgSavingsRate = summary?.avgSavingsRate

  // If user has entered savings data, we can compute more meaningful projections
  const hasIncomeData = (summary?.monthsWithIncome ?? 0) > 0
  const avgMonthlySavings = hasIncomeData && summary
    ? Math.max(0, summary.avgMonthlySpendCents > 0
        ? snapshots
            .filter((s) => s.cardId === null && s.savingsCents != null)
            .reduce((sum, s) => sum + (s.savingsCents ?? 0), 0) /
          Math.max(1, snapshots.filter((s) => s.cardId === null && s.savingsCents != null).length)
        : 0)
    : 0

  const projectedMonths = useMemo(() =>
    monthsToTarget(targetCents, 0, Math.max(avgMonthlySavings, 1), annualRate),
    [targetCents, avgMonthlySavings, annualRate],
  )

  const pct = fireProgress(
    futureValueCents(0, Math.max(avgMonthlySavings, 0), annualRate, 12 * 5),
    futureValueCents(0, Math.max(avgMonthlySavings, 0), annualRate, projectedMonths),
  )

  const handleSaveGoal = async (data: GoalCreate | GoalUpdate) => {
    if ('id' in data) await update(data as GoalUpdate)
    else await create(data as GoalCreate)
  }

  const handleUpdateIncome = async (month: string, ic: number | null, sc: number | null) => {
    await updateIncome({ month, cardId: null, incomeCents: ic, savingsCents: sc })
  }

  const loading = goalsLoading || snapsLoading

  return (
    <div className="flex-1 p-[28px] overflow-y-auto h-screen">
      {/* Header */}
      <div className="mb-[24px]">
        <h2 className="text-[20px] font-[650] text-[var(--color-text)] tracking-[-0.02em] mb-[4px]">
          Goals & FIRE
        </h2>
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          Connect your daily spending to your early retirement target.
        </p>
      </div>

      {goalsError && (
        <div className="mb-[20px] px-[14px] py-[10px] rounded-[8px] border border-red-500/30 bg-red-500/8 text-[12px] text-red-500">
          {goalsError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-[60px] text-[13px] text-[var(--color-text-tertiary)]">
          Loading…
        </div>
      ) : (
        <div className="space-y-[24px]">
          {/* Summary stat cards */}
          <div className="flex gap-[12px]">
            <StatCard
              label="Avg monthly spend"
              value={formatCents(avgMonthlySpend)}
              sub={{ text: 'last 12 months' }}
            />
            <StatCard
              label="Avg savings rate"
              value={avgSavingsRate != null ? `${(avgSavingsRate * 100).toFixed(0)}%` : '—'}
              valueColor={
                avgSavingsRate == null ? undefined
                  : avgSavingsRate >= 0.5 ? '#16A34A'
                  : avgSavingsRate >= 0.2 ? '#D97706'
                  : '#EF4444'
              }
              sub={{ text: hasIncomeData ? 'from entered income' : 'enter income below to track' }}
            />
            <StatCard
              label="Time to FIRE"
              value={hasIncomeData && avgMonthlySavings > 0 ? formatMonths(projectedMonths) : '—'}
              sub={
                hasIncomeData && avgMonthlySavings > 0 && projectedDate(projectedMonths)
                  ? { text: `by ${projectedDate(projectedMonths) ?? ''}` }
                  : { text: 'enter savings data to project' }
              }
            />
          </div>

          {/* Two-column layout: goal form + progress / impact calculator */}
          <div className="grid grid-cols-[320px_1fr] gap-[20px]">
            {/* Left: goal setup */}
            <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-[20px]">
              <h3 className="text-[13px] font-[650] text-[var(--color-text)] mb-[4px]">
                FIRE target
              </h3>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mb-[16px]">
                Set your retirement number and assumed annual return.
              </p>
              <GoalForm goal={fireGoal} onSave={handleSaveGoal} />

              {/* Progress */}
              {hasIncomeData && avgMonthlySavings > 0 && (
                <div className="mt-[20px] pt-[20px] border-t border-[var(--color-border)]">
                  <div className="flex justify-between text-[11px] text-[var(--color-text-tertiary)] mb-[8px]">
                    <span>5-yr projected progress</span>
                    <span className="font-[600] text-[var(--color-text)]">{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} />
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-[8px]">
                    At current savings pace toward{' '}
                    <span className="font-[600] text-[var(--color-text)]">
                      {formatCents(targetCents)}
                    </span>
                  </p>
                </div>
              )}

              {!hasIncomeData && (
                <div className="mt-[16px] pt-[16px] border-t border-[var(--color-border)]">
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    Enter your monthly income and savings in the table below to unlock projections.
                  </p>
                </div>
              )}
            </div>

            {/* Right: impact calculator */}
            <ImpactCalculator annualRate={annualRate} />
          </div>

          {/* Monthly history */}
          {snapshots.length > 0 ? (
            <SnapshotTable snapshots={snapshots} onUpdateIncome={handleUpdateIncome} />
          ) : (
            <EmptyState
              title="No spending history yet"
              description="Import transactions to start tracking monthly spending and enter income data for FIRE projections."
            />
          )}
        </div>
      )}
    </div>
  )
}
