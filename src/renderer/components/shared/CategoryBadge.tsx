import { getCategoryColor } from '../../lib/constants'

interface CategoryBadgeProps {
  name: string
  className?: string
}

export function CategoryBadge({ name, className = '' }: CategoryBadgeProps) {
  const color = getCategoryColor(name)

  return (
    <span
      className={`inline-flex items-center gap-[5px] text-[11px] font-[520] px-[9px] py-[3px] rounded-[4px] ${className}`}
      style={{ color, background: `${color}11` }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full opacity-70 flex-shrink-0"
        style={{ background: color }}
      />
      {name}
    </span>
  )
}
