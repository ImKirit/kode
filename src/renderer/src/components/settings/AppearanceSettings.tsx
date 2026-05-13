import { useRef } from 'react'
import type { ThemeName } from '../../styles/themes'

interface AppearanceSettingsProps {
  theme: ThemeName
  customPrimary: string
  customAccent: string
  onSetTheme(name: ThemeName): void
  onSetCustomColors(primary: string, accent: string): void
}

const THEME_PREVIEWS: Record<ThemeName, { bg: string; sidebar: string; btn: string; accent: string }> = {
  light:  { bg: '#f3f3f3', sidebar: '#ebebeb', btn: '#1a1a1a', accent: '#0066b8' },
  dark:   { bg: '#1e1e1e', sidebar: '#1a1a1a', btn: '#e8e8e8', accent: '#0e9de8' },
  custom: { bg: '', sidebar: '', btn: '', accent: '' }
}

const THEME_LABELS: Record<ThemeName, string> = {
  light: 'Light',
  dark: 'Dark',
  custom: 'Custom'
}

interface ColorRowProps {
  label: string
  id: string
  value: string
  onChange(hex: string): void
}

function ColorRow({ label, id, value, onChange }: ColorRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function isValidHex(v: string) {
    return /^#[0-9a-fA-F]{6}$/.test(v)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Color swatch */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: 24,
            height: 24,
            borderRadius: 'var(--radius-sm)',
            background: value,
            border: '1px solid var(--border)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />
        {/* Hidden native color picker */}
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          tabIndex={-1}
        />
        {/* Hex text input */}
        <input
          type="text"
          aria-label={`${label} hex`}
          defaultValue={value}
          key={value}
          onBlur={e => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            if (isValidHex(v)) onChange(v)
            else e.target.value = value
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          style={{
            width: 76,
            padding: '3px 7px',
            fontSize: 12,
            fontFamily: 'var(--font-editor)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            outline: 'none'
          }}
        />
      </div>
    </div>
  )
}

export function AppearanceSettings({
  theme, customPrimary, customAccent, onSetTheme, onSetCustomColors
}: AppearanceSettingsProps) {
  const themes: ThemeName[] = ['light', 'dark', 'custom']

  return (
    <div style={{ padding: '0 4px' }}>
      <h3 style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: 16
      }}>
        Theme
      </h3>

      {/* Theme cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {themes.map(name => {
          const preview = name === 'custom'
            ? { bg: customPrimary, sidebar: customPrimary, btn: '#1a1a1a', accent: customAccent }
            : THEME_PREVIEWS[name]
          const isSelected = theme === name

          return (
            <button
              key={name}
              aria-pressed={isSelected}
              onClick={() => onSetTheme(name)}
              style={{
                flex: 1,
                padding: 0,
                border: `2px solid ${isSelected ? 'var(--kode-btn)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color var(--transition-fast)'
              }}
            >
              {/* Mini preview */}
              <div style={{
                height: 44,
                background: preview.bg || 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '0 6px 6px'
              }}>
                {/* Simulated button pill */}
                <div style={{
                  height: 12,
                  width: 28,
                  borderRadius: 6,
                  background: preview.btn || 'var(--kode-btn)',
                  opacity: 0.9
                }} />
                <div style={{ flex: 1 }} />
                {/* Simulated accent dot */}
                <div style={{
                  height: 8,
                  width: 8,
                  borderRadius: '50%',
                  background: preview.accent || 'var(--accent)'
                }} />
              </div>
              {/* Label */}
              <div style={{
                padding: '5px 0',
                fontSize: 11,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                {THEME_LABELS[name]}
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom color pickers */}
      {theme === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ColorRow
            label="Background"
            id="custom-primary"
            value={customPrimary}
            onChange={v => onSetCustomColors(v, customAccent)}
          />
          <ColorRow
            label="Accent"
            id="custom-accent"
            value={customAccent}
            onChange={v => onSetCustomColors(customPrimary, v)}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>
            Background sets the base color. Accent is used for highlights and active states.
            Text and button colors are derived automatically from brightness.
          </p>
        </div>
      )}
    </div>
  )
}
