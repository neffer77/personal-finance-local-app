interface SubStat {
  icon?: string
  text: string
  color?: string
}

interface StatCardProps {
  label: string
  value: string
  sub?: SubStat
  valueColor?: string
}

export function StatCard({ label, value, sub, valueColor }: StatCardProps) {
  return (
    <div className="flex-1 p-[14px_18px] rounded-[8px] bg-[var(--color-bg-card)] border border-[var(--color-border)]">
      <div className="text-[11px] font-[500] text-[var(--color-text-tertiary)] tracking-[0.04em] uppercase mb-[6px]">
        {label}
      </div>
      <div
        className="text-[22px] font-[650] tracking-[-0.03em] tabular-nums"
        style={{ color: valueColor ?? 'var(--color-text)' }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[11px] font-[500] mt-[5px] flex items-center gap-[4px]"
          style={{ color: sub.color ?? 'var(--color-text-secondary)' }}
        >
          {sub.icon && <span>{sub.icon}</span>}
          {sub.text}
        </div>
      )}
    </div>
  )
}
