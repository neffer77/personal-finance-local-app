import { formatMonthShort, formatCents } from '../../lib/format'
import type { MonthlyTotal } from '../../lib/analytics'

interface SpendingTrendProps {
  data: MonthlyTotal[]
  maxMonths?: number
}

export function SpendingTrend({ data, maxMonths = 6 }: SpendingTrendProps) {
  const recent = [...data].reverse().slice(0, maxMonths)
  const maxAmount = Math.max(...recent.map((d) => d.totalSpendCents), 1)

  if (recent.length === 0) {
    return (
      <div className="text-[12px] text-[var(--color-text-tertiary)] py-[20px] text-center">
        No trend data yet
      </div>
    )
  }

  return (
    <div className="flex items-end gap-[8px] h-[160px] pt-[10px]">
      {recent.map((item, i) => {
        const heightPct = (item.totalSpendCents / maxAmount) * 100
        const isCurrent = i === recent.length - 1
        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-[6px]">
            <span
              className="text-[10px] font-[550] tabular-nums"
              style={{ color: isCurrent ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
            >
              {formatCents(item.totalSpendCents).replace('$', '$')}
            </span>
            <div
              className="w-full rounded-[5px] transition-[height_0.5s_ease]"
              style={{
                height: `${Math.max(heightPct * 1.2, 4)}px`,
                maxHeight: '120px',
                background: isCurrent ? 'var(--color-accent)' : 'var(--color-bg-active)',
              }}
            />
            <span className="text-[10px] font-[500] text-[var(--color-text-tertiary)]">
              {formatMonthShort(item.month).split(' ')[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
