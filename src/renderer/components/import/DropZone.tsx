import { useState, useCallback } from 'react'

interface DropZoneProps {
  onFileSelected: (filePath: string) => void
  disabled?: boolean
}

export function DropZone({ onFileSelected, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)

  const handleBrowse = async () => {
    const result = await window.api.dialog.openFile({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    } as Electron.OpenDialogOptions)
    if (!result.canceled && result.filePaths.length > 0) {
      onFileSelected(result.filePaths[0])
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find((f) => f.name.endsWith('.csv'))
    if (csvFile) {
      // Electron provides path via webkitRelativePath or we use the file's path
      // In Electron, File objects have a path property
      const filePath = (csvFile as File & { path?: string }).path
      if (filePath) {
        onFileSelected(filePath)
      }
    }
  }, [disabled, onFileSelected])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-[10px] p-[40px] text-center transition-all duration-[150ms] cursor-pointer
        ${dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-subtle)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : handleBrowse}
    >
      <div className="text-[32px] mb-[12px] opacity-40">↑</div>
      <div className="text-[13px] font-[560] text-[var(--color-text)] mb-[6px]">
        Drop CSV here or click to browse
      </div>
      <div className="text-[11px] text-[var(--color-text-tertiary)]">
        Supports Chase credit card CSV exports
      </div>
    </div>
  )
}
