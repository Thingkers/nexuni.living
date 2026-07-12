'use client'

import { useEffect, useRef, useState } from 'react'
import { GraduationCap, ChevronDown } from 'lucide-react'
import { useUniversities } from '@/features/universities/hooks/useUniversities'
import { useCurrentProfile } from '@/features/universities/hooks/useCurrentProfile'

type UniversityMultiSelectFilterProps = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

// "Near My Campus" is not a separate filter mechanism — it just adds the
// current user's own university_id into the same selectedIds array, so it
// composes with the checkbox list and any other active filters.
export function UniversityMultiSelectFilter({ selectedIds, onChange }: UniversityMultiSelectFilterProps) {
  const { universities } = useUniversities()
  const { universityId: myUniversityId } = useCurrentProfile()
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

  const isNearMyCampusActive = myUniversityId != null && selectedIds.includes(myUniversityId)

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none hover:border-teal-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
          {selectedIds.length > 0 ? `University (${selectedIds.length})` : 'University'}
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {universities.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggle(u.id)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                {u.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {myUniversityId && (
        <button
          type="button"
          onClick={() => toggle(myUniversityId)}
          className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            isNearMyCampusActive
              ? 'border-teal-600 bg-teal-600 text-white'
              : 'border-gray-200 text-gray-700 hover:border-teal-400 dark:border-gray-700 dark:text-gray-200'
          }`}
        >
          Near My Campus
        </button>
      )}
    </div>
  )
}
