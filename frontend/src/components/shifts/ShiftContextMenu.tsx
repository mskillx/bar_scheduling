import { useEffect, useRef } from 'react'

interface ShiftContextMenuProps {
  x: number
  y: number
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ShiftContextMenu({ x, y, onEdit, onDelete, onClose }: ShiftContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-dark-700 border border-dark-500 rounded-lg shadow-xl py-1 min-w-[140px]"
      style={{ top: y, left: x }}
    >
      <button
        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-dark-600 transition-colors"
        onClick={() => { onEdit(); onClose() }}
      >
        ✏️ Edit shift
      </button>
      <button
        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-dark-600 transition-colors"
        onClick={() => { onDelete(); onClose() }}
      >
        🗑️ Delete shift
      </button>
    </div>
  )
}
