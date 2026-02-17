import { CategoryBadge } from '../shared/CategoryBadge'
import { AmountDisplay } from '../shared/AmountDisplay'
import { formatDateShort } from '../../lib/format'
import type { EnrichedTransaction } from '../../../shared/types'

interface TransactionRowProps {
  transaction: EnrichedTransaction
  selected: boolean
  onClick: (tx: EnrichedTransaction) => void
}

export function TransactionRow({ transaction: tx, selected, onClick }: TransactionRowProps) {
  return (
    <tr
      onClick={() => onClick(tx)}
      className={`cursor-pointer transition-colors duration-[100ms] border-b border-[var(--color-border-subtle)]
        ${selected
          ? 'bg-[var(--color-accent-subtle)]'
          : 'bg-transparent hover:bg-[var(--color-bg-hover)]'
        }`}
    >
      {/* Date */}
      <td className="px-[14px] py-[10px] text-[12px] text-[var(--color-text-secondary)] tabular-nums whitespace-nowrap">
        {formatDateShort(tx.transactionDate)}
      </td>

      {/* Description */}
      <td className="px-[14px] py-[10px] max-w-[280px]">
        <div className="text-[13px] font-[520] text-[var(--color-text)] truncate">
          {tx.effectiveName}
        </div>
        <div className="text-[11px] text-[var(--color-text-tertiary)] font-mono truncate">
          {tx.description.length > 40 ? `${tx.description.slice(0, 40)}…` : tx.description}
        </div>
      </td>

      {/* Category */}
      <td className="px-[14px] py-[10px]">
        <CategoryBadge name={tx.effectiveCategory} />
      </td>

      {/* Card */}
      <td className="px-[14px] py-[10px]">
        <span className="text-[11px] font-[500] text-[var(--color-text-tertiary)] bg-[var(--color-bg-subtle)] px-[8px] py-[2px] rounded-[4px] whitespace-nowrap">
          {tx.cardOwner}
        </span>
      </td>

      {/* Amount */}
      <td className="px-[14px] py-[10px] text-right whitespace-nowrap">
        <AmountDisplay cents={tx.amountCents} showPlus />
      </td>
    </tr>
  )
}
