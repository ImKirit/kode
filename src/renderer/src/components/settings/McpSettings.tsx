import { useState } from 'react'
import type { McpServerConfig } from '../../types/electron'

interface McpSettingsProps {
  servers: McpServerConfig[]
  permission: 'ask' | 'full'
  onAddServer(config: Omit<McpServerConfig, 'id'>): void
  onRemoveServer(id: string): void
  onSetPermission(value: 'ask' | 'full'): void
}

interface AddFormState {
  name: string
  type: 'stdio' | 'http'
  command: string
  args: string
  url: string
}

const INITIAL_FORM: AddFormState = { name: '', type: 'stdio', command: '', args: '', url: '' }

export function McpSettings({ servers, permission, onAddServer, onRemoveServer, onSetPermission }: McpSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<AddFormState>(INITIAL_FORM)

  function handleSave() {
    if (!form.name.trim()) return
    const config: Omit<McpServerConfig, 'id'> = {
      name: form.name.trim(),
      type: form.type,
      ...(form.type === 'stdio'
        ? { command: form.command.trim(), args: form.args.trim() ? form.args.trim().split(' ') : [] }
        : { url: form.url.trim() })
    }
    onAddServer(config)
    setForm(INITIAL_FORM)
    setShowAddForm(false)
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, color: 'var(--text-muted)',
    marginBottom: 8, marginTop: 16
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', marginBottom: 6, padding: '5px 8px', fontSize: 12,
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 4, color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <div>
      {/* Permission toggle */}
      <div style={sectionLabel}>Permission</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['full', 'ask'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onSetPermission(mode)}
            style={{
              padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
              background: permission === mode ? 'var(--accent)' : 'var(--bg-sidebar)',
              border: `1px solid ${permission === mode ? 'var(--accent)' : 'var(--border)'}`,
              color: permission === mode ? '#fff' : 'var(--text-secondary)'
            }}
          >
            {mode === 'full' ? 'Full Access' : 'Ask'}
          </button>
        ))}
      </div>

      {/* Built-in servers */}
      <div style={sectionLabel}>Built-in Servers</div>
      {[
        { name: 'Filesystem', desc: 'read_file, write_file, list_directory, search_files' },
        { name: 'Shell', desc: 'run_shell' }
      ].map(s => (
        <div key={s.name} style={rowStyle}>
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{s.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.desc}</span>
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: 'rgba(74,222,128,0.1)', color: '#4ade80',
            border: '1px solid rgba(74,222,128,0.3)'
          }}>always on</span>
        </div>
      ))}

      {/* Custom servers */}
      <div style={sectionLabel}>Custom Servers</div>
      {servers.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>No custom servers added.</div>
      )}
      {servers.map(s => (
        <div key={s.id} style={rowStyle}>
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{s.name}</span>
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: 'var(--bg-primary)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontFamily: 'monospace'
          }}>{s.type}</span>
          <button
            data-flat
            onClick={() => onRemoveServer(s.id)}
            style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'none', border: '1px solid var(--border)',
              cursor: 'pointer', color: '#f87171'
            }}
          >
            Remove
          </button>
        </div>
      ))}

      {/* Add server form */}
      {showAddForm ? (
        <div style={{
          marginTop: 8, padding: 12,
          background: 'var(--bg-primary)', borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <input
            placeholder="Server name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['stdio', 'http'] as const).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, type: t }))}
                style={{
                  padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                  background: form.type === t ? 'var(--accent)' : 'var(--bg-sidebar)',
                  border: `1px solid ${form.type === t ? 'var(--accent)' : 'var(--border)'}`,
                  color: form.type === t ? '#fff' : 'var(--text-muted)'
                }}
              >{t}</button>
            ))}
          </div>
          {form.type === 'stdio' ? (
            <>
              <input
                placeholder="Command (e.g. npx)"
                value={form.command}
                onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                style={inputStyle}
              />
              <input
                placeholder="Args (space-separated)"
                value={form.args}
                onChange={e => setForm(f => ({ ...f, args: e.target.value }))}
                style={inputStyle}
              />
            </>
          ) : (
            <input
              placeholder="SSE URL (e.g. https://...)"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              style={inputStyle}
            />
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              data-flat
              onClick={() => { setForm(INITIAL_FORM); setShowAddForm(false) }}
              style={{
                padding: '4px 12px', fontSize: 12, borderRadius: 5,
                background: 'none', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text-secondary)'
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              style={{
                padding: '4px 12px', fontSize: 12, borderRadius: 5,
                background: 'var(--accent)', border: 'none',
                cursor: 'pointer', color: '#fff'
              }}
            >Save</button>
          </div>
        </div>
      ) : (
        <button
          data-flat
          onClick={() => setShowAddForm(true)}
          style={{
            marginTop: 8, padding: '5px 12px', fontSize: 12, borderRadius: 6,
            background: 'var(--bg-sidebar)', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-secondary)'
          }}
        >+ Add Server</button>
      )}
    </div>
  )
}
