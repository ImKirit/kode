import { useCallback } from 'react'
import { useSettings } from '../../hooks/useSettings'
import type { EditorConfig, AppSettings } from '../../hooks/useSettings'

interface BuiltinPluginDef {
  id: string
  name: string
  category: string
  description: string
  getEnabled(settings: AppSettings): boolean
  toggle(settings: AppSettings): AppSettings
}

const DEFAULT_EDITOR: EditorConfig = {
  fontSize: 13, tabSize: 2, wordWrap: 'off', minimap: true, lineNumbers: 'on',
  formatOnSave: true, stickyScroll: true, autoCloseBrackets: true, showWhitespace: false
}

function withEditor(s: AppSettings, patch: Partial<EditorConfig>): AppSettings {
  return { ...s, editor: { ...(s.editor ?? DEFAULT_EDITOR), ...patch } }
}

const BUILTIN_PLUGINS: BuiltinPluginDef[] = [
  {
    id: 'formatOnSave',
    name: 'Format on Save',
    category: 'Productivity',
    description: 'Formats the entire document with the built-in formatter every time you press Ctrl+S.',
    getEnabled: s => s.editor?.formatOnSave ?? true,
    toggle: s => withEditor(s, { formatOnSave: !(s.editor?.formatOnSave ?? true) })
  },
  {
    id: 'aiCommitMessages',
    name: 'AI Commit Messages',
    category: 'AI',
    description: 'Adds a Generate button in the Git panel that drafts a conventional commit message from your staged diff.',
    getEnabled: s => s.aiCommitMessages ?? true,
    toggle: s => ({ ...s, aiCommitMessages: !(s.aiCommitMessages ?? true) })
  }
]

const categoryColor: Record<string, string> = {
  Productivity: '#22d3ee',
  AI:           '#a78bfa'
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle(): void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      style={{
        width: 30, height: 17, borderRadius: 9, cursor: 'pointer', flexShrink: 0,
        background: enabled ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.15s'
      }}
    >
      <div style={{
        position: 'absolute', top: 2.5,
        left: enabled ? 14 : 2.5,
        width: 12, height: 12, borderRadius: '50%', background: 'white',
        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
      }} />
    </div>
  )
}

export function PluginBrowser({ rootPath: _rootPath }: { rootPath?: string | null }) {
  const { settings, updateSettings } = useSettings()

  const handleToggleBuiltin = useCallback((plugin: BuiltinPluginDef) => {
    if (!settings) return
    updateSettings(plugin.toggle(settings)).catch(() => {})
  }, [settings, updateSettings])

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: 8, marginTop: 20
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid var(--border)'
  }

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
        Extensions
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Manage built-in features and discover new plugins for Kode.
      </div>

      {/* Kode built-in plugins */}
      <div style={sectionLabel}>Kode Plugins</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
        Built-in features you can toggle. More are on the way.
      </div>
      {BUILTIN_PLUGINS.map(plugin => {
        const catColor = categoryColor[plugin.category] ?? 'var(--text-muted)'
        const enabled = settings ? plugin.getEnabled(settings) : false
        return (
          <div key={plugin.id} style={row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{plugin.name}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 5px', borderRadius: 4,
                  background: catColor + '22', color: catColor, border: `1px solid ${catColor}55`
                }}>{plugin.category}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 5px', borderRadius: 4,
                  background: 'var(--kode-selection)', color: 'var(--accent)', border: '1px solid var(--accent)44'
                }}>Kode</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                {plugin.description}
              </div>
            </div>
            <Toggle enabled={enabled} onToggle={() => handleToggleBuiltin(plugin)} />
          </div>
        )
      })}

      {/* External plugins coming soon */}
      <div style={{ marginTop: 28 }}>
        <div style={{ ...sectionLabel, marginTop: 0 }}>External Plugins</div>
        <div style={{
          padding: '20px 16px',
          background: 'var(--bg-primary)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Coming soon
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            External plugin support is on the roadmap.<br />
            You will be able to install community plugins directly from the marketplace.
          </div>
        </div>
      </div>
    </div>
  )
}
