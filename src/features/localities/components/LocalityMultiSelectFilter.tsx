'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { useLocalities } from '@/features/localities/hooks/useLocalities'

type LocalityMultiSelectFilterProps = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

// Mirrors UniversityMultiSelectFilter's shape (not a generalization of it —
// that component is intentionally single-purpose, tied to
// useCurrentProfile()'s "Near My Campus" shortcut, which has no locality
// equivalent).
export function LocalityMultiSelectFilter({ selectedIds, onChange }: LocalityMultiSelectFilterProps) {
  const { localities } = useLocalities()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none hover:border-teal-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <MapPin className="h-3.5 w-3.5 text-gray-400" />
        {selectedIds.length > 0 ? `Area (${selectedIds.length})` : 'Area'}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {localities.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(l.id)}
                onChange={() => toggle(l.id)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              {l.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
