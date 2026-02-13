'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Avoid hydration mismatch (theme is resolved client-side)
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          aria-label="Toggle theme"
          className="relative inline-flex h-6 w-11 items-center rounded-full border border-gray-200 bg-gray-100"
        >
          <span className="inline-block h-5 w-5 translate-x-1 rounded-full bg-white" />
        </button>
        <Moon className="h-4 w-4 text-gray-400" />
      </div>
    )
  }

  const resolved = theme === 'system' ? systemTheme : theme
  const isDark = resolved === 'dark'

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />

      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={
          'relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ' +
          (isDark
            ? 'border-gray-700 bg-gray-700'
            : 'border-gray-200 bg-gray-100')
        }
      >
        <span
          className={
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ' +
            (isDark ? 'translate-x-5' : 'translate-x-1')
          }
        />
      </button>

      <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
    </div>
  )
}
