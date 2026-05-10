import type { ThemeName } from '../../styles/themes'

interface AppearanceSettingsProps {
  theme: ThemeName
  customPrimary: string
  customAccent: string
  onSetTheme(name: ThemeName): void
  onSetCustomColors(primary: string, accent: string): void
}

const themeOptions: { name: ThemeName; label: string }[] = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
  { name: 'custom', label: 'Custom' }
]

export function AppearanceSettings({
  theme, customPrimary, customAccent, onSetTheme, onSetCustomColors
}: AppearanceSettingsProps) {
  return (
    <div style={{ padding: '0 4px' }}>
      <h3 style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        marginBottom: 16
      }}>
        Theme
      </h3>

      {/* Theme selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {themeOptions.map(opt => (
          <button
            key={opt.name}
            aria-pressed={theme === opt.name}
            onClick={() => onSetTheme(opt.name)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 'var(--radius-md)',
              background: theme === opt.name ? 'var(--accent)' : 'var(--bg-button)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: theme === opt.name ? 600 : 400,
              border: theme === opt.name ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom color pickers (only when Custom selected) */}
      {theme === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label
              htmlFor="custom-primary"
              style={{ fontSize: 13, color: 'var(--text-secondary)' }}
            >
              Primary color
            </label>
            <input
              id="custom-primary"
              type="color"
              aria-label="Primary color"
              value={customPrimary}
              onChange={e => onSetCustomColors(e.target.value, customAccent)}
              style={{
                width: 48,
                height: 32,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                padding: 2,
                background: 'var(--bg-input)',
                boxShadow: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label
              htmlFor="custom-accent"
              style={{ fontSize: 13, color: 'var(--text-secondary)' }}
            >
              Accent color
            </label>
            <input
              id="custom-accent"
              type="color"
              aria-label="Accent color"
              value={customAccent}
              onChange={e => onSetCustomColors(customPrimary, e.target.value)}
              style={{
                width: 48,
                height: 32,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                padding: 2,
                background: 'var(--bg-input)',
                boxShadow: 'none'
              }}
            />
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Primary sets the background base. Accent is used for buttons and highlights.
            Text colors are derived automatically based on brightness.
          </p>
        </div>
      )}
    </div>
  )
}
