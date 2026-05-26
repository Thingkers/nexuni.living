'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] =
    useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={() =>
        setTheme(
          theme === 'dark'
            ? 'light'
            : 'dark',
        )
      }
      className="rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
    >
      {theme === 'dark'
        ? '☀️ Light'
        : '🌙 Dark'}
    </button>
  )
}