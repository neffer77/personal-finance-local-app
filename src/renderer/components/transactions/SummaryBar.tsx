import { useState } from 'react'
import { useUiStore } from '../../stores/ui.store'
import { StatCard } from '../shared/StatCard'
import { formatCents, formatMonth, currentMonth } from '../../lib/format'
import type { EnrichedTransaction } from '../../../shared/types'
import { computeCategoryTotals, netSpend } from '../../lib/analytics'

interface SummaryBarProps {
  transactions: EnrichedTransaction[]
}

export function SummaryBar({ transactions }: SummaryBarProps) {
  const { summaryBarVisible, setSummaryBarVisible } = useUiStore()
  const [expanded, setExpanded] = useState(summaryBarVisible)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    setSummaryBarVisible(next)
  }

  const nonPayments = transactions.filter((t) => t.type !== 'Payment')
  const totalNet = netSpend(nonPayments)
  const categoryTotals = computeCategoryTotals(nonPayments)
  const topCategory = categoryTotals[0]

  return (
    <div className="px-[28px]">
      <button
        onClick={toggle}
        className="flex items-center gap-[6px] bg-transparent border-none cursor-pointer text-[var(--color-text-tertiary)] text-[11px] font-[550] py-[12px] pb-[8px] tracking-[0.04em] uppercase"
      >
        <span
          className="text-[10px] transition-transform duration-[150ms]"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}
        >
          ▶
        </span>
        {formatMonth(currentMonth())} Summary
      </button>

      {expanded && (
        <div className="flex gap-[14px] pb-[16px] animate-slide-down">
          <StatCard
            label="Total Spent"
            value={formatCents(Math.abs(totalNet))}
            sub={{ icon: '◉', text: `${nonPayments.length} transactions`, color: 'var(--color-text-secondary)' }}
          />
          <StatCard
            label="Top Category"
            value={topCategory?.category ?? '—'}
            sub={topCategory ? {
              icon: '◉',
              text: `${formatCents(topCategory.absAmountCents)} · ${topCategory.percentage.toFixed(1)}%`,
              color: 'var(--color-text-secondary)',
            } : undefined}
          />
          <StatCard
            label="Transactions"
            value={String(nonPayments.length)}
          />
          <StatCard
            label="Credits"
            value={formatCents(nonPayments.filter((t) => t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0))}
            valueColor="var(--color-green)"
          />
        </div>
      )}
    </div>
  )
}
