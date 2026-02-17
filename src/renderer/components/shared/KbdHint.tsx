interface KbdHintProps {
  keys: string[]
  className?: string
}

export function KbdHint({ keys, className = '' }: KbdHintProps) {
  return (
    <span className={`inline-flex gap-[3px] ml-2 opacity-40 ${className}`}>
      {keys.map((k, i) => (
        <span
          key={i}
          className="text-[10px] font-mono px-[5px] py-[1px] rounded-[3px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] leading-[16px]"
        >
          {k}
        </span>
      ))}
    </span>
  )
}
