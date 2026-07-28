'use client'

import { useEffect, useState } from 'react'

// Reads the saved/system preference once on mount and applies it to
// <html>. Any mounted caller can toggle it — the class on
// document.documentElement is the single source of truth, this hook just
// mirrors it into React state.
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const next = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light'
    document.documentElement.classList.toggle('dark', next === 'dark')
    queueMicrotask(() => setTheme(next))
  }, [])

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return { theme, toggleTheme }
}
