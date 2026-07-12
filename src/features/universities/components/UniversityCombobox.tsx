'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUniversities } from '@/features/universities/hooks/useUniversities'
import type { University } from '@/features/universities/types'

type UniversityComboboxResult = {
  id: string | null
  name: string | null
  rawText: string
}

type UniversityComboboxProps = {
  value: string | null
  initialText: string
  onChange: (result: UniversityComboboxResult) => void
  className?: string
  placeholder?: string
}

// .normalize('NFC') guards against a real Bangla-input edge case: two
// visually-identical strings can end up with different underlying codepoint
// sequences depending on the input method (e.g. an Avro-style IME vs.
// pasted text), which would otherwise make a correct-looking match fail a
// naive .includes() check.
function normalize(value: string) {
  return value.normalize('NFC').toLowerCase()
}

export function UniversityCombobox({
  value,
  initialText,
  onChange,
  className,
  placeholder = 'e.g. AIUB, NSU, IUB...',
}: UniversityComboboxProps) {
  const { universities, loading } = useUniversities()
  const [query, setQuery] = useState(initialText)
  const [open, setOpen] = useState(false)

  // Resolve the initial displayed text once the university list is
  // available: prefer the resolved name for `value` if it's still an
  // active university, otherwise fall back to the free-text `initialText`
  // (also covers a `value` pointing at a since-deactivated university).
  // Intentionally only re-runs when `loading` flips to false, not on every
  // `value`/`initialText` change, so it doesn't clobber what the user is
  // actively typing.
  useEffect(() => {
    if (loading) return
    const match = value ? universities.find((u) => u.id === value) : undefined
    // Reconciling displayed text with the university list once it finishes
    // loading (an external system, per this lint rule's own carve-out) —
    // intentionally only reacts to `loading`, not `value`/`initialText`, so
    // it never clobbers what the user is actively typing afterward.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(match ? match.name : initialText)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const matches = useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return []
    return universities
      .filter((u) => {
        if (normalize(u.name).includes(needle)) return true
        if (u.name_bn && normalize(u.name_bn).includes(needle)) return true
        return u.aliases.some((alias) => normalize(alias).includes(needle))
      })
      .slice(0, 8)
  }, [query, universities])

  function handleInputChange(next: string) {
    setQuery(next)
    setOpen(true)
    onChange({ id: null, name: null, rawText: next })
  }

  function handleSelect(university: University) {
    setQuery(university.name)
    setOpen(false)
    onChange({ id: university.id, name: university.name, rawText: university.name })
  }

  return (
    <div className="relative">
      <input
        placeholder={placeholder}
        className={className}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => matches.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {matches.map((university) => (
            <button
              key={university.id}
              type="button"
              className="block w-full px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(university)
              }}
            >
              {university.name}
              {university.name_bn && (
                <span className="ml-1 text-gray-400">({university.name_bn})</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
