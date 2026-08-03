import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'theme'
const DARK_CLASS = 'dark'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    /* localStorage unavailable — fall through */
  }
  return 'system'
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  const applyTheme = useCallback((t: Theme) => {
    const resolved = resolveTheme(t)
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add(DARK_CLASS)
    } else {
      root.classList.remove(DARK_CLASS)
    }
  }, [])

  // Initial apply
  useEffect(() => {
    applyTheme(theme)
  }, [applyTheme, theme])

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme, applyTheme])

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t)
      try {
        localStorage.setItem(STORAGE_KEY, t)
      } catch {
        /* localStorage unavailable — ignore */
      }
      applyTheme(t)
    },
    [applyTheme],
  )

  const resolvedTheme = theme === 'system' ? resolveTheme('system') : theme

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
