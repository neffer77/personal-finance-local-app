import { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ title, onClose, children, maxWidth = '480px' }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[10px] w-full mx-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-slide-down"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-[var(--color-border)]">
          <span className="text-[13px] font-[620] text-[var(--color-text)]">{title}</span>
          <button
            onClick={onClose}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] w-[28px] h-[28px] rounded-[4px] flex items-center justify-center text-[18px] leading-none transition-all"
          >
            ×
          </button>
        </div>
        <div className="p-[20px]">{children}</div>
      </div>
    </div>
  )
}
