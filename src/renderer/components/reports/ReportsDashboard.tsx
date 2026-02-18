import { useState, useMemo } from 'react'
import { useReport } from '../../hooks/useReport'
import { StatCard } from '../shared/StatCard'
import { formatCents, formatCentsCompact, formatMonthShort } from '../../lib/format'
import type { ReportPeriod, ReportMonth } from '../../../shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
  { value: 'year_to_date', label: 'Year to date' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

interface OwnerTabProps {
  label: string
  active: boolean
  onClick: () => void
}

function OwnerTab({ label, active, onClick }: OwnerTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-[12px] py-[5px] rounded-[6px] text-[12px] font-[530] transition-all duration-[120ms]
        ${active
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
        }`}
    >
      {label}
    </button>
  )
}

interface MonthBarChartProps {
  months: ReportMonth[]
}

function MonthBarChart({ months }: MonthBarChartProps) {
  const maxNet = Math.max(...months.map((m) => m.netSpendCents), 1)

  if (months.length === 0) {
    return (
      <div className="text-[12px] text-[var(--color-text-tertiary)] py-[24px] text-center">
        No data for this period
      </div>
    )
  }

  return (
    <div className="flex items-end gap-[6px] h-[120px] pt-[8px]">
      {months.map((m, i) => {
        const heightPct = (m.netSpendCents / maxNet) * 100
        const isLast = i === months.length - 1
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-[5px] min-w-0">
            <span
              className="text-[9px] font-[560] tabular-nums truncate"
              style={{ color: isLast ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
            >
              {formatCentsCompact(m.netSpendCents)}
            </span>
            <div
              className="w-full rounded-[4px] transition-all duration-[400ms]"
              style={{
                height: `${Math.max(heightPct * 0.75, 3)}px`,
                maxHeight: '72px',
                background: isLast ? 'var(--color-accent)' : 'var(--color-bg-active)',
              }}
            />
            <span className="text-[9px] font-[500] text-[var(--color-text-tertiary)] truncate">
              {formatMonthShort(m.month).split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsDashboard() {
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null)
  const [period, setPeriod] = useState<ReportPeriod>('last_12_months')

  const filter = useMemo(
    () => ({ owner: selectedOwner, period }),
    [selectedOwner, period],
  )

  const { report, owners, loading, error } = useReport(filter)

  const ownerTabs = useMemo(
    () => [
      { key: null, label: 'Household' },
      ...owners.map((o) => ({ key: o, label: o })),
    ],
    [owners],
  )

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? ''

  return (
    <div className="flex-1 overflow-y-auto h-screen">
      {/* Print-visible header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-[28px] py-[14px] flex items-center gap-[16px]">
        <div className="flex-1">
          <h2 className="text-[18px] font-[650] text-[var(--color-text)] tracking-[-0.02em]">
            Reports
          </h2>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-[1px]">
            Spending summary — {periodLabel}
            {selectedOwner ? ` · ${selectedOwner}` : ' · Household'}
          </p>
        </div>

        {/* Period selector */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
          className="px-[10px] py-[6px] rounded-[6px] text-[12px] font-[500] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text)] cursor-pointer"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] text-[12px] font-[540] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <span>⎙</span>
          <span>Print / Share</span>
        </button>
      </div>

      <div className="px-[28px] pt-[20px] pb-[40px] space-y-[24px]">

        {/* Owner tabs */}
        {ownerTabs.length > 1 && (
          <div className="flex items-center gap-[6px]">
            {ownerTabs.map((tab) => (
              <OwnerTab
                key={tab.key ?? '__household__'}
                label={tab.label}
                active={selectedOwner === tab.key}
                onClick={() => setSelectedOwner(tab.key)}
              />
            ))}
          </div>
        )}

        {/* Loading / error states */}
        {loading && (
          <div className="text-[12px] text-[var(--color-text-tertiary)] py-[20px]">
            Loading report…
          </div>
        )}

        {error && (
          <div className="text-[12px] text-[var(--color-red)] py-[8px]">{error}</div>
        )}

        {!loading && !error && report && (
          <>
            {/* ── Stat cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-[12px] lg:grid-cols-4">
              <StatCard
                label="Total Spend"
                value={formatCents(report.totalSpendCents)}
                sub={`${report.transactionCount} transactions`}
              />
              <StatCard
                label="Net Spend"
                value={formatCents(report.netSpendCents)}
                sub={`${formatCents(report.totalCreditsCents)} credits`}
              />
              <StatCard
                label="Avg Monthly"
                value={formatCents(report.avgMonthlyNetSpendCents)}
                sub={`over ${report.monthlyTotals.length} month${report.monthlyTotals.length !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="Subscriptions"
                value={formatCents(report.subscriptionMonthlyCostCents) + '/mo'}
                sub={formatCents(report.subscriptionMonthlyCostCents * 12) + '/yr'}
              />
            </div>

            {/* Savings rate banner (if data available) */}
            {report.avgSavingsRate !== null && (
              <div className="flex items-center gap-[12px] px-[16px] py-[12px] rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                <div className="text-[22px] font-[700] text-[var(--color-accent)] tabular-nums">
                  {(report.avgSavingsRate * 100).toFixed(1)}%
                </div>
                <div>
                  <div className="text-[12px] font-[600] text-[var(--color-text)]">
                    Average savings rate
                  </div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)]">
                    Based on household income entries for this period
                  </div>
                </div>
              </div>
            )}

            {/* ── Two-column layout: categories + monthly trend ─────────────── */}
            <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-2">

              {/* Category breakdown */}
              <section className="border border-[var(--color-border)] rounded-[10px] p-[20px]">
                <h3 className="text-[13px] font-[640] text-[var(--color-text)] mb-[16px] tracking-[-0.01em]">
                  Spending by Category
                </h3>

                {report.topCategories.length === 0 ? (
                  <div className="text-[12px] text-[var(--color-text-tertiary)] py-[16px] text-center">
                    No category data
                  </div>
                ) : (
                  <div className="space-y-[10px]">
                    {report.topCategories.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-[4px]">
                          <span className="text-[12px] font-[530] text-[var(--color-text)] truncate max-w-[60%]">
                            {cat.category}
                          </span>
                          <div className="flex items-center gap-[12px]">
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">
                              {cat.percentage}%
                            </span>
                            <span className="text-[12px] font-[570] text-[var(--color-text)] tabular-nums">
                              {formatCents(cat.amountCents)}
                            </span>
                          </div>
                        </div>
                        <div className="h-[4px] rounded-full bg-[var(--color-bg-active)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width_0.6s_ease]"
                            style={{
                              width: `${cat.percentage}%`,
                              background: 'var(--color-accent)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Monthly trend */}
              <section className="border border-[var(--color-border)] rounded-[10px] p-[20px]">
                <h3 className="text-[13px] font-[640] text-[var(--color-text)] mb-[4px] tracking-[-0.01em]">
                  Monthly Trend
                </h3>
                <p className="text-[11px] text-[var(--color-text-tertiary)] mb-[12px]">
                  Net spend per month
                </p>
                <MonthBarChart months={report.monthlyTotals} />

                {/* Monthly table below chart */}
                {report.monthlyTotals.length > 0 && (
                  <div className="mt-[16px] border-t border-[var(--color-border)] pt-[12px] space-y-[6px]">
                    {[...report.monthlyTotals].reverse().slice(0, 6).map((m) => (
                      <div
                        key={m.month}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="text-[var(--color-text-secondary)]">
                          {formatMonthShort(m.month)}
                        </span>
                        <div className="flex gap-[16px]">
                          <span className="text-[var(--color-text-tertiary)]">
                            {formatCents(m.creditsCents)} credits
                          </span>
                          <span className="font-[570] text-[var(--color-text)] tabular-nums">
                            {formatCents(m.netSpendCents)} net
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Per-owner breakdown (household view only) ─────────────────── */}
            {selectedOwner === null && report.owners.length > 1 && (
              <section className="border border-[var(--color-border)] rounded-[10px] p-[20px]">
                <h3 className="text-[13px] font-[640] text-[var(--color-text)] mb-[4px] tracking-[-0.01em]">
                  Household Members
                </h3>
                <p className="text-[11px] text-[var(--color-text-tertiary)] mb-[14px]">
                  Select an owner above to see their individual breakdown
                </p>
                <div className="flex gap-[8px] flex-wrap">
                  {report.owners.map((owner) => (
                    <button
                      key={owner}
                      onClick={() => setSelectedOwner(owner)}
                      className="px-[12px] py-[6px] rounded-[6px] text-[12px] font-[530] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      View {owner}'s report →
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Report footer ────────────────────────────────────────────── */}
            <div className="text-[11px] text-[var(--color-text-tertiary)] pt-[8px] border-t border-[var(--color-border)]">
              Report covers {report.startDate} to {report.endDate}
              {selectedOwner ? ` · ${selectedOwner}'s cards only` : ' · All cards (household)'}
              {' · Generated by SpendLens'}
            </div>
          </>
        )}

        {/* Empty state — no transactions at all */}
        {!loading && !error && !report && (
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-[10px] p-[40px] text-center text-[var(--color-text-tertiary)]">
            <div className="text-[32px] mb-[12px] opacity-30">▤</div>
            <div className="text-[13px] font-[520] mb-[4px]">No data yet</div>
            <div className="text-[12px]">Import a CSV to see your spending report</div>
          </div>
        )}
      </div>
    </div>
  )
}
