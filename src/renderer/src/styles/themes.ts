export type ThemeName = 'light' | 'dark' | 'custom'

export interface ThemeVars {
  '--bg-primary': string
  '--bg-secondary': string
  '--bg-sidebar': string
  '--bg-input': string
  '--bg-tab-active': string
  '--bg-tab-inactive': string
  '--border': string
  '--border-light': string
  '--text-primary': string
  '--text-secondary': string
  '--text-muted': string
  '--accent': string
  '--kode-btn': string
  '--kode-btn-fg': string
  '--kode-btn-hover': string
  '--kode-surface-2': string
  '--kode-border-dim': string
  '--kode-titlebar': string
  '--kode-statusbar': string
  '--kode-scrollbar': string
  '--kode-selection': string
  '--monaco-theme': string
}

export const lightTheme: ThemeVars = {
  '--bg-primary':      '#f3f3f3',
  '--bg-secondary':    '#ffffff',
  '--bg-sidebar':      '#f3f3f3',
  '--bg-input':        '#ffffff',
  '--bg-tab-active':   '#ffffff',
  '--bg-tab-inactive': '#ececec',
  '--border':          '#e0e0e0',
  '--border-light':    '#ebebeb',
  '--text-primary':    '#1a1a1a',
  '--text-secondary':  '#555555',
  '--text-muted':      '#999999',
  '--accent':          '#0066b8',
  '--kode-btn':        '#1a1a1a',
  '--kode-btn-fg':     '#ffffff',
  '--kode-btn-hover':  '#333333',
  '--kode-surface-2':  '#f5f5f5',
  '--kode-border-dim': '#ebebeb',
  '--kode-titlebar':   '#e8e8e8',
  '--kode-statusbar':  '#1a1a1a',
  '--kode-scrollbar':  '#cccccc',
  '--kode-selection':  'rgba(0, 102, 184, 0.12)',
  '--monaco-theme':    'vs',
}

export const darkTheme: ThemeVars = {
  '--bg-primary':      '#1e1e1e',
  '--bg-secondary':    '#252526',
  '--bg-sidebar':      '#1a1a1a',
  '--bg-input':        '#2a2a2a',
  '--bg-tab-active':   '#1e1e1e',
  '--bg-tab-inactive': '#2d2d2d',
  '--border':          '#3a3a3a',
  '--border-light':    '#4a4a4a',
  '--text-primary':    '#f0f0f0',
  '--text-secondary':  '#a0a0a0',
  '--text-muted':      '#606060',
  '--accent':          '#0e9de8',
  '--kode-btn':        '#e8e8e8',
  '--kode-btn-fg':     '#1a1a1a',
  '--kode-btn-hover':  '#ffffff',
  '--kode-surface-2':  '#2a2a2a',
  '--kode-border-dim': '#333333',
  '--kode-titlebar':   '#2d2d2d',
  '--kode-statusbar':  '#1a1a1a',
  '--kode-scrollbar':  '#555555',
  '--kode-selection':  'rgba(14, 157, 232, 0.15)',
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
    '--bg-tab-active':   secondary,
    '--bg-tab-inactive': tabInactive,
    '--border':          isDark ? adjustHex(primary, 25) : adjustHex(primary, -20),
    '--border-light':    isDark ? adjustHex(primary, 35) : adjustHex(primary, -30),
    '--text-primary':    isDark ? '#f0f0f0' : '#1a1a1a',
    '--text-secondary':  isDark ? '#a0a0a0' : '#555555',
    '--text-muted':      isDark ? '#606060' : '#999999',
    '--accent':          accent,
    '--kode-btn':        isDark ? '#e8e8e8' : '#1a1a1a',
    '--kode-btn-fg':     isDark ? '#1a1a1a' : '#ffffff',
    '--kode-btn-hover':  isDark ? '#ffffff' : '#333333',
    '--kode-surface-2':  adjustHex(primary, isDark ? 15 : -5),
    '--kode-border-dim': adjustHex(primary, isDark ? 20 : -12),
    '--kode-titlebar':   adjustHex(primary, isDark ? 15 : -12),
    '--kode-statusbar':  '#1a1a1a',
    '--kode-scrollbar':  isDark ? '#555555' : '#cccccc',
    '--kode-selection':  isDark ? 'rgba(14, 157, 232, 0.15)' : 'rgba(0, 102, 184, 0.12)',
    '--monaco-theme':    isDark ? 'vs-dark' : 'vs',
  }
}
