import type { ImportResult } from '../../../shared/types'

interface ImportSummaryProps {
  result: ImportResult
  onDone: () => void
}

export function ImportSummary({ result, onDone }: ImportSummaryProps) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-3 gap-[12px]">
        <div className="p-[14px] rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-center">
          <div className="text-[22px] font-[650] text-[var(--color-green)] tabular-nums">{result.importedCount}</div>
          <div className="text-[11px] font-[500] text-[var(--color-text-tertiary)] mt-[4px] uppercase tracking-[0.04em]">Imported</div>
        </div>
        <div className="p-[14px] rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-center">
          <div className="text-[22px] font-[650] text-[var(--color-text-secondary)] tabular-nums">{result.skippedCount}</div>
          <div className="text-[11px] font-[500] text-[var(--color-text-tertiary)] mt-[4px] uppercase tracking-[0.04em]">Skipped</div>
        </div>
        <div className="p-[14px] rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-center">
          <div className={`text-[22px] font-[650] tabular-nums ${result.errorCount > 0 ? 'text-[var(--color-red)]' : 'text-[var(--color-text-secondary)]'}`}>
            {result.errorCount}
          </div>
          <div className="text-[11px] font-[500] text-[var(--color-text-tertiary)] mt-[4px] uppercase tracking-[0.04em]">Errors</div>
        </div>
      </div>

      <div className="text-[12px] text-[var(--color-text-secondary)]">
        <strong className="font-[560] text-[var(--color-text)]">{result.filename}</strong>
        {' '}&mdash; {result.rowCount} rows processed
      </div>

      {result.errors.length > 0 && (
        <div className="border border-[var(--color-red)]/20 rounded-[6px] bg-[var(--color-red-subtle)] p-[12px]">
          <div className="text-[11px] font-[600] text-[var(--color-red)] uppercase tracking-[0.04em] mb-[8px]">
            Row Errors
          </div>
          <div className="flex flex-col gap-[6px] max-h-[120px] overflow-y-auto">
            {result.errors.map((err, i) => (
              <div key={i} className="text-[11px] text-[var(--color-red)]">
                Row {err.row}: {err.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onDone}
        className="w-full py-[9px] rounded-[6px] text-[12px] font-[550] bg-[var(--color-accent)] text-white border-none cursor-pointer hover:opacity-90 transition-opacity mt-[4px]"
      >
        Done
      </button>
    </div>
  )
}
