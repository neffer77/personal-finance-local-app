import { getCategoryColor } from '../../lib/constants'
import { formatCents } from '../../lib/format'
import type { CategoryTotal } from '../../lib/analytics'

interface CategoryBreakdownProps {
  data: CategoryTotal[]
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex-1 h-[8px] rounded-[4px] bg-[var(--color-bg-active)] overflow-hidden">
      <div
        className="h-full rounded-[4px] transition-[width_0.5s_ease]"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="text-[12px] text-[var(--color-text-tertiary)] py-[20px] text-center">
        No spending data
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {data.slice(0, 8).map((item) => {
        const color = getCategoryColor(item.category)
        return (
          <div key={item.category}>
            <div className="flex justify-between items-center mb-[5px]">
              <div className="flex items-center gap-[8px]">
                <span className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[12px] font-[520] text-[var(--color-text)]">{item.category}</span>
              </div>
              <div className="flex items-center gap-[10px]">
                <span className="text-[12px] font-[580] text-[var(--color-text)] tabular-nums">
                  {formatCents(item.absAmountCents)}
                </span>
                <span className="text-[10px] font-[550] text-[var(--color-text-tertiary)] tabular-nums w-[36px] text-right">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <MiniBar pct={item.percentage} color={color} />
          </div>
        )
      })}
    </div>
  )
}
