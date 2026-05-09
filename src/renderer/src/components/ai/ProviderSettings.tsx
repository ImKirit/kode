import { X } from 'lucide-react'
import type { AppSettings } from '../../types/electron.d'

export const PROVIDER_MODELS = {
  anthropic: [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' }
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ]
} as const

interface ProviderSettingsProps {
  settings: AppSettings
  onSetActiveProvider(provider: 'anthropic' | 'openai'): void
  onSetProviderKey(provider: 'anthropic' | 'openai', key: string): void
  onSetProviderModel(provider: 'anthropic' | 'openai', model: string): void
  onClose(): void
}

const PLACEHOLDERS: Record<'anthropic' | 'openai', string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...'
}

export function ProviderSettings({
  settings,
  onSetActiveProvider,
  onSetProviderKey,
  onSetProviderModel,
  onClose
}: ProviderSettingsProps) {
  const active = settings.activeProvider
  const providerConfig = settings.providers[active]
  const models = PROVIDER_MODELS[active]

  const sectionStyle: React.CSSProperties = {
    padding: '10px 12px',
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      borderBottom: '2px solid var(--border)'
    }}>
      {/* Settings header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Provider Settings
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Provider selector */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Provider</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['anthropic', 'openai'] as const).map(p => (
            <button
              key={p}
              onClick={() => onSetActiveProvider(p)}
              aria-pressed={active === p}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: 12,
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
                background: active === p ? 'var(--accent)' : 'var(--bg-secondary)',
                color: active === p ? '#fff' : 'var(--text-secondary)',
                fontFamily: 'inherit'
              }}
            >
              {p === 'anthropic' ? 'Anthropic' : 'OpenAI'}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div style={sectionStyle}>
        <label style={labelStyle}>API Key</label>
        <input
          type="password"
          value={providerConfig.apiKey}
          placeholder={PLACEHOLDERS[active]}
          onChange={e => onSetProviderKey(active, e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Model selector */}
      <div style={{ ...sectionStyle, borderBottom: 'none' }}>
        <label style={labelStyle}>Model</label>
        <select
          value={providerConfig.model}
          onChange={e => onSetProviderModel(active, e.target.value)}
          style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
