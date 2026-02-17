import { formatCents } from '../../lib/format'

interface AmountDisplayProps {
  cents: number
  showPlus?: boolean
  className?: string
}

export function AmountDisplay({ cents, showPlus = false, className = '' }: AmountDisplayProps) {
  const isCredit = cents > 0
  const colorClass = isCredit ? 'text-[var(--color-green)]' : 'text-[var(--color-text)]'
  const prefix = isCredit && showPlus ? '+' : ''

  return (
    <span className={`tabular-nums font-[580] ${colorClass} ${className}`}>
      {prefix}{formatCents(cents)}
    </span>
  )
}
