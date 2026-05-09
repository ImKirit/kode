export type ThemeName = 'light' | 'dark' | 'custom'

export interface ThemeVars {
  '--bg-primary': string
  '--bg-secondary': string
  '--bg-sidebar': string
  '--bg-input': string
  '--bg-button': string
  '--bg-tab-active': string
  '--bg-tab-inactive': string
  '--border': string
  '--border-light': string
  '--text-primary': string
  '--text-secondary': string
  '--text-muted': string
  '--accent': string
  '--shadow-button': string
  '--shadow-button-hover': string
  '--shadow-button-active': string
  '--monaco-theme': string
}

export const lightTheme: ThemeVars = {
  '--bg-primary':      '#f5f5f5',
  '--bg-secondary':    '#ffffff',
  '--bg-sidebar':      '#ebebeb',
  '--bg-input':        '#ffffff',
  '--bg-button':       '#1a1a1a',
  '--bg-tab-active':   '#ffffff',
  '--bg-tab-inactive': '#e8e8e8',
  '--border':          '#d8d8d8',
  '--border-light':    '#c0c0c0',
  '--text-primary':    '#1a1a1a',
  '--text-secondary':  '#4a4a4a',
  '--text-muted':      '#8a8a8a',
  '--accent':          '#0e9de8',
  '--shadow-button':       '0 2px 0 rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)',
  '--shadow-button-hover': '0 4px 0 rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.12)',
  '--shadow-button-active':'0 0px 0 rgba(0,0,0,0.14), inset 0 1px 3px rgba(0,0,0,0.10)',
  '--monaco-theme':    'vs',
}

export const darkTheme: ThemeVars = {
  '--bg-primary':      '#1e1e1e',
  '--bg-secondary':    '#252526',
  '--bg-sidebar':      '#1a1a1a',
  '--bg-input':        '#2a2a2a',
  '--bg-button':       '#f0f0f0',
  '--bg-tab-active':   '#1e1e1e',
  '--bg-tab-inactive': '#2d2d2d',
  '--border':          '#3a3a3a',
  '--border-light':    '#4a4a4a',
  '--text-primary':    '#f0f0f0',
  '--text-secondary':  '#a0a0a0',
  '--text-muted':      '#606060',
  '--accent':          '#0e9de8',
  '--shadow-button':       '0 2px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)',
  '--shadow-button-hover': '0 4px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
  '--shadow-button-active':'0 0px 0 rgba(0,0,0,0.4), inset 0 1px 3px rgba(0,0,0,0.3)',
  '--monaco-theme':    'vs-dark',
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ]
}

function adjustHex(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex)
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  const toHex = (v: number) => clamp(v + delta).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function perceivedLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function buildCustomTheme(primary: string, accent: string): ThemeVars {
  const lum = perceivedLuminance(primary)
  const isDark = lum < 0.5
  const secondary = adjustHex(primary, isDark ? 20 : -10)
  const sidebar = adjustHex(primary, isDark ? -5 : -8)
  const input = isDark ? adjustHex(primary, 15) : '#ffffff'
  const tabInactive = adjustHex(primary, isDark ? 10 : -5)

  return {
    '--bg-primary':      primary,
    '--bg-secondary':    secondary,
    '--bg-sidebar':      sidebar,
    '--bg-input':        input,
    '--bg-button':       isDark ? '#f0f0f0' : '#1a1a1a',
    '--bg-tab-active':   secondary,
    '--bg-tab-inactive': tabInactive,
    '--border':          isDark ? adjustHex(primary, 25) : adjustHex(primary, -20),
    '--border-light':    isDark ? adjustHex(primary, 35) : adjustHex(primary, -30),
    '--text-primary':    isDark ? '#f0f0f0' : '#1a1a1a',
    '--text-secondary':  isDark ? '#a0a0a0' : '#4a4a4a',
    '--text-muted':      isDark ? '#606060' : '#8a8a8a',
    '--accent':          accent,
    '--shadow-button':       isDark
      ? '0 2px 0 rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)'
      : '0 2px 0 rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)',
    '--shadow-button-hover': isDark
      ? '0 4px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
      : '0 4px 0 rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.12)',
    '--shadow-button-active': isDark
      ? '0 0px 0 rgba(0,0,0,0.4), inset 0 1px 3px rgba(0,0,0,0.3)'
      : '0 0px 0 rgba(0,0,0,0.14), inset 0 1px 3px rgba(0,0,0,0.10)',
    '--monaco-theme':    isDark ? 'vs-dark' : 'vs',
  }
}
