import { useState, useEffect, useCallback } from 'react'
import { lightTheme, darkTheme, buildCustomTheme, type ThemeName, type ThemeVars } from '../styles/themes'

const STORAGE_KEY = 'kode.theme'

interface ThemeState {
  name: ThemeName
  primary: string
  accent: string
}

function loadState(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { name: 'light', primary: '#f5f5f5', accent: '#0e9de8' }
}

function applyVars(vars: ThemeVars) {
  const el = document.documentElement
  for (const [k, v] of Object.entries(vars)) {
    el.style.setProperty(k, v)
  }
}

interface UseThemeResult {
  theme: ThemeName
  customPrimary: string
  customAccent: string
  monacoTheme: string
  setTheme(name: ThemeName): void
  setCustomColors(primary: string, accent: string): void
}

export function useTheme(): UseThemeResult {
  const [state, setState] = useState<ThemeState>(loadState)

  const getVars = useCallback((s: ThemeState): ThemeVars => {
    if (s.name === 'light') return lightTheme
    if (s.name === 'dark') return darkTheme
    return buildCustomTheme(s.primary, s.accent)
  }, [])

  useEffect(() => {
    applyVars(getVars(state))
  }, [state, getVars])

  const setTheme = useCallback((name: ThemeName) => {
    setState(prev => {
      const next = { ...prev, name }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const setCustomColors = useCallback((primary: string, accent: string) => {
    setState(prev => {
      const next = { name: 'custom' as ThemeName, primary, accent }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return {
    theme: state.name,
    customPrimary: state.primary,
    customAccent: state.accent,
    monacoTheme: getVars(state)['--monaco-theme'],
    setTheme,
    setCustomColors
  }
}
