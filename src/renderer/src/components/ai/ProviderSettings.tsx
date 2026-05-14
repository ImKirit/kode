import { useState } from 'react'
import { X, Github } from 'lucide-react'
import type { AppSettings, ProviderId } from '../../hooks/useSettings'

export const PROVIDER_MODELS: Record<string, Array<{ id: string; name: string }>> = {
  anthropic: [
    { id: 'claude-opus-4-7',          name: 'Claude Opus 4.7' },
    { id: 'claude-sonnet-4-6',        name: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001',name: 'Claude Haiku 4.5' }
  ],
  openai: [
    { id: 'gpt-4o',       name: 'GPT-4o' },
    { id: 'gpt-4-turbo',  name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo',name: 'GPT-3.5 Turbo' }
  ],
  kode: [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7' },
    { id: 'gpt-4o',            name: 'GPT-4o' }
  ],
  copilot: [
    { id: 'gpt-4o',               name: 'GPT-4o (Copilot)' },
    { id: 'claude-3.5-sonnet',    name: 'Claude 3.5 Sonnet (Copilot)' }
  ]
}

const PROVIDER_LABELS: Record<ProviderId, string> = {
  kode:      'Kode',
  copilot:   'Copilot',
  anthropic: 'Claude',
  openai:    'Codex'
}

interface ProviderSettingsProps {
  settings: AppSettings
  onSetActiveProvider(provider: ProviderId): void
  onSetProviderKey(provider: ProviderId, key: string): void
  onSetProviderModel(provider: ProviderId, model: string): void
  onClose(): void
  onOpenAccountSettings?(): void
}

export function ProviderSettings({
  settings, onSetActiveProvider, onSetProviderKey, onSetProviderModel: _onSetProviderModel,
  onClose, onOpenAccountSettings
}: ProviderSettingsProps) {
  const [connectingProvider, setConnectingProvider] = useState<ProviderId | null>(null)
  const [connectTab, setConnectTab] = useState<'account' | 'api'>('account')
  const [tempKey, setTempKey] = useState('')

  const active = settings.activeProvider
  const providerConfig = settings.providers[active] ?? { apiKey: '', model: '' }
  const isApiKeyProvider = active === 'anthropic' || active === 'openai'
  const isConnected = !!providerConfig.apiKey?.trim()

  const sectionStyle: React.CSSProperties = {
    padding: '10px 12px', background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border)', flexShrink: 0
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)',
    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, display: 'block'
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  }

  const providerOrder: ProviderId[] = ['kode', 'copilot', 'anthropic', 'openai']

  const handleSaveKey = () => {
    if (!tempKey.trim()) return
    onSetProviderKey(active, tempKey.trim())
    setConnectingProvider(null)
    setTempKey('')
  }

  const handleCancelConnect = () => {
    setConnectingProvider(null)
    setTempKey('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderBottom: '2px solid var(--border)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          AI Provider
        </span>
        <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
          <X size={13} />
        </button>
      </div>

      {/* Provider selector */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Provider</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {providerOrder.map(p => {
            const isSelected = active === p
            const badge = p === 'kode' ? 'Subscription' : p === 'copilot' ? 'GitHub' : undefined
            return (
              <button
                key={p}
                onClick={() => onSetActiveProvider(p)}
                aria-pressed={isSelected}
                style={{
                  padding: '6px 8px', fontSize: 11, fontWeight: 500,
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 5, cursor: 'pointer',
                  background: isSelected ? 'rgba(var(--accent-rgb, 59,130,246), 0.1)' : 'var(--bg-secondary)',
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 1
                }}
              >
                <span>{PROVIDER_LABELS[p]}</span>
                {badge && <span style={{ fontSize: 9, opacity: 0.7 }}>{badge}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Kode: link to account settings */}
      {active === 'kode' && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Authentication</span>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
            Uses your Kode subscription.
          </div>
          <button
            onClick={onOpenAccountSettings}
            style={{
              width: '100%', padding: '8px 0', background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', fontSize: 12,
              fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            Go to Account Settings
          </button>
        </div>
      )}

      {/* Copilot: link to account settings */}
      {active === 'copilot' && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Authentication</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
            <Github size={12} />
            Sign in with GitHub.
          </div>
          <button
            onClick={onOpenAccountSettings}
            style={{
              width: '100%', padding: '8px 0', background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', fontSize: 12,
              fontWeight: 500, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            Go to Account Settings
          </button>
        </div>
      )}

      {/* Claude / Codex: API key auth with Account | API tabs */}
      {isApiKeyProvider && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Authentication</span>

          {isConnected ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--bg-sidebar)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>API key connected</span>
              </div>
              <button
                onClick={() => { onSetProviderKey(active, ''); setConnectingProvider(null) }}
                aria-label="Disconnect"
                style={{ fontSize: 12, color: 'var(--text-muted)', background: 'transparent', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Disconnect
              </button>
            </div>
          ) : connectingProvider === active ? (
            <div>
              {/* Tab headers */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
                {(['account', 'api'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setConnectTab(tab)}
                    style={{
                      padding: '5px 12px', fontSize: 11, fontWeight: 600,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', textTransform: 'capitalize',
                      color: connectTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                      borderBottom: `2px solid ${connectTab === tab ? 'var(--accent)' : 'transparent'}`,
                      marginBottom: -1
                    }}
                  >
                    {tab === 'account' ? 'Account' : 'API'}
                  </button>
                ))}
              </div>

              {connectTab === 'account' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Sign in with your {PROVIDER_LABELS[active]} account to use your Pro or Max subscription quota.
                  </p>
                  <button
                    style={{
                      width: '100%', padding: '10px 0', background: 'var(--kode-btn)',
                      color: 'var(--kode-btn-fg)', borderRadius: 'var(--radius-md)',
                      fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    Sign in with {PROVIDER_LABELS[active]}
                  </button>
                  <button
                    onClick={handleCancelConnect}
                    style={{
                      width: '100%', padding: '7px 0', background: 'var(--bg-sidebar)',
                      color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                      fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {active === 'anthropic'
                      ? 'Get your key at console.anthropic.com → API Keys.'
                      : 'Get your key at platform.openai.com → API Keys.'}
                  </p>
                  <label htmlFor="api-key-input" style={{ ...labelStyle, marginBottom: 0 }}>API Key</label>
                  <input
                    id="api-key-input"
                    type="password"
                    placeholder="sk-..."
                    value={tempKey}
                    autoFocus
                    onChange={e => setTempKey(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tempKey.trim()) handleSaveKey()
                      if (e.key === 'Escape') handleCancelConnect()
                    }}
                    style={{ ...inputStyle, padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSaveKey}
                      style={{
                        flex: 1, padding: '7px 0', background: 'var(--accent)', color: '#fff',
                        borderRadius: 'var(--radius-sm)', fontSize: 13, border: 'none',
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Save Key
                    </button>
                    <button
                      onClick={handleCancelConnect}
                      style={{
                        padding: '7px 16px', background: 'var(--bg-sidebar)',
                        color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                        fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              style={{
                width: '100%', padding: '10px 0', background: 'var(--kode-btn)',
                color: 'var(--kode-btn-fg)', borderRadius: 'var(--radius-md)',
                fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
              }}
              onClick={() => { setConnectingProvider(active); setConnectTab('account') }}
            >
              Connect Account
            </button>
          )}
        </div>
      )}
    </div>
  )
}
