import { useState, useEffect } from 'react'
import { transactionsApi } from '../../api/transactions'
import { computeCategoryTotals, computeMonthlyTotals } from '../../lib/analytics'
import { formatMonth, currentMonth } from '../../lib/format'
import { CategoryBreakdown } from './CategoryBreakdown'
import { SpendingTrend } from './SpendingTrend'
import { useAppStore } from '../../stores/app.store'
import type { EnrichedTransaction } from '../../../shared/types'

export function InsightsDashboard() {
  const { selectedCardId } = useAppStore()
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const result = await transactionsApi.list({
          cardId: selectedCardId,
          limit: 1000,
          page: 1,
        })
        setTransactions(result.transactions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [selectedCardId])

  const categoryTotals = computeCategoryTotals(transactions.filter((t) => t.type !== 'Payment'))
  const monthlyTotals = computeMonthlyTotals(transactions)

  if (loading) {
    return (
      <div className="p-[28px] text-[12px] text-[var(--color-text-tertiary)]">Loading insights…</div>
    )
  }

  if (error) {
    return (
      <div className="p-[28px] text-[12px] text-[var(--color-red)]">{error}</div>
    )
  }

  return (
    <div className="p-[28px] overflow-y-auto h-screen">
      <h2 className="text-[20px] font-[650] text-[var(--color-text)] tracking-[-0.02em] mb-[4px]">
        Insights
      </h2>
      <p className="text-[13px] text-[var(--color-text-tertiary)] mb-[28px]">
        {formatMonth(currentMonth())} · {selectedCardId ? 'Selected Card' : 'All Cards'}
      </p>

      <div className="grid grid-cols-2 gap-[20px]">
        {/* Category Breakdown */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[10px] p-[20px]">
          <div className="text-[12px] font-[600] text-[var(--color-text-secondary)] uppercase tracking-[0.03em] mb-[18px]">
            Spending by Category
          </div>
          <CategoryBreakdown data={categoryTotals} />
        </div>

        {/* Spending Trend */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[10px] p-[20px]">
          <div className="text-[12px] font-[600] text-[var(--color-text-secondary)] uppercase tracking-[0.03em] mb-[18px]">
            6 Month Trend
          </div>
          <SpendingTrend data={monthlyTotals} />
        </div>
      </div>
    </div>
  )
}
