import { useState } from 'react'
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
  const [connecting, setConnecting] = useState<string | null>(null)

  const active = settings.activeProvider
  const providerConfig = settings.providers[active]
  const models = PROVIDER_MODELS[active]

  const isConnected = (key: string | undefined) => !!key?.trim()

  const setProviderKey = (provider: 'anthropic' | 'openai', key: string) => {
    onSetProviderKey(provider, key)
  }

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
        {isConnected(providerConfig?.apiKey) ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80', flexShrink: 0,
                display: 'inline-block'
              }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                API key connected
              </span>
            </div>
            <button
              data-flat
              onClick={() => setProviderKey(active, '')}
              style={{
                fontSize: 12, color: 'var(--text-muted)', background: 'transparent',
                padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Disconnect
            </button>
          </div>
        ) : connecting === active ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              {active === 'anthropic'
                ? 'Get your API key from console.anthropic.com → API Keys.'
                : 'Get your API key from platform.openai.com → API Keys.'}
            </p>
            <input
              type="password"
              placeholder="sk-..."
              aria-label="API Key"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setProviderKey(active, (e.target as HTMLInputElement).value)
                  setConnecting(null)
                }
                if (e.key === 'Escape') setConnecting(null)
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{
                  flex: 1, padding: '7px 0',
                  background: 'var(--accent)', color: '#ffffff',
                  borderRadius: 'var(--radius-sm)', fontSize: 13,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}
                onClick={e => {
                  const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement)
                  if (input?.value) {
                    setProviderKey(active, input.value)
                    setConnecting(null)
                  }
                }}
              >
                Save Key
              </button>
              <button
                data-flat
                style={{
                  padding: '7px 16px',
                  background: 'var(--bg-sidebar)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)', fontSize: 13,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}
                onClick={() => setConnecting(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{
              width: '100%',
              padding: '10px 0',
              background: 'var(--kode-btn)',
              color: 'var(--kode-btn-fg)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 500,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}
            onClick={() => setConnecting(active)}
          >
            Connect Account
          </button>
        )}
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
