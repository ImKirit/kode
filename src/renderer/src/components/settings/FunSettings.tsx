import type { AppSettings } from '../../hooks/useSettings'

const PORT_PRESETS = [8000, 6767, 3000]

interface FunSettingsProps {
  settings: AppSettings | null
  onUpdate(settings: AppSettings): void
}

export function FunSettings({ settings, onUpdate }: FunSettingsProps) {
  const port = settings?.localHostPort ?? 8000

  const setPort = (p: number) => {
    if (!settings) return
    onUpdate({ ...settings, localHostPort: p })
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: 8, display: 'block'
  }

  return (
    <div>
      <span style={sectionLabel}>Local Host Port</span>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
        Port used when you activate Local Host from the sidebar.
      </p>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {PORT_PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setPort(p)}
            style={{
              padding: '5px 14px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
              background: port === p ? 'var(--kode-btn)' : 'var(--bg-sidebar)',
              border: `1px solid ${port === p ? 'var(--kode-btn)' : 'var(--border)'}`,
              color: port === p ? 'var(--kode-btn-fg)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-editor)',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s'
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom port */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label htmlFor="localhost-port" style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
          Custom port
        </label>
        <input
          id="localhost-port"
          type="number"
          min={1}
          max={65535}
          value={port}
          onChange={e => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n) && n >= 1 && n <= 65535) setPort(n)
          }}
          style={{
            width: 100, padding: '5px 8px', fontSize: 12,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text-primary)', outline: 'none',
            fontFamily: 'var(--font-editor)'
          }}
        />
      </div>
    </div>
  )
}
