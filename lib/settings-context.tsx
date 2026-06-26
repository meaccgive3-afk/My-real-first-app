'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { type Lang, dirOf, translate } from './i18n'

export type Theme = 'light' | 'dark'

type SettingsContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  dir: 'rtl' | 'ltr'
  t: (key: string) => string
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const LANG_KEY = 'sakinah:lang'
const THEME_KEY = 'sakinah:theme'

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'ar'
  const stored = localStorage.getItem(LANG_KEY) as Lang | null
  if (stored) return stored
  return 'ar'
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_KEY) as Theme | null
  if (stored) return stored
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')
  const [theme, setThemeState] = useState<Theme>('dark')

  // Hydrate from storage on mount
  useEffect(() => {
    setLangState(getInitialLang())
    setThemeState(getInitialTheme())
  }, [])

  // Apply lang + dir to <html>
  useEffect(() => {
    const dir = dirOf(lang)
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang])

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    root.style.colorScheme = theme
  }, [theme])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // ignore
    }
  }

  const setTheme = (next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // ignore
    }
  }

  const value = useMemo<SettingsContextValue>(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      dir: dirOf(lang),
      t: (key: string) => translate(lang, key),
    }),
    [lang, theme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
