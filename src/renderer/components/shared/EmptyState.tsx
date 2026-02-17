interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] px-[40px] text-center">
      {icon && (
        <div className="text-[40px] mb-[16px] opacity-20">{icon}</div>
      )}
      <div className="text-[14px] font-[560] text-[var(--color-text)] mb-[6px]">{title}</div>
      {description && (
        <div className="text-[12px] text-[var(--color-text-tertiary)] max-w-[300px]">{description}</div>
      )}
      {action && <div className="mt-[20px]">{action}</div>}
    </div>
  )
}
