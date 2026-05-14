import type { McpServerConfig } from '../../types/electron'

interface McpSettingsProps {
  servers: McpServerConfig[]
  permission: 'ask' | 'full'
  onAddServer(config: Omit<McpServerConfig, 'id'>): void
  onRemoveServer(id: string): void
  onSetPermission(value: 'ask' | 'full'): void
}

export function McpSettings({ servers, permission, onRemoveServer, onSetPermission }: McpSettingsProps) {
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase' as const, color: 'var(--text-muted)',
    marginBottom: 8, marginTop: 16
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13
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
              color: permission === mode ? 'var(--accent-fg)' : 'var(--text-secondary)'
            }}
          >
            {mode === 'full' ? 'Full Access' : 'Ask'}
          </button>
        ))}
      </div>

      {/* Built-in servers */}
      <div style={sectionLabel}>Built-in Servers</div>
      {[
        { name: 'Filesystem', desc: 'read_file, write_file, list_directory' },
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
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>No custom servers added yet.</div>
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

      {/* Add server instructions */}
      <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>
          To add an MCP server, ask the AI: <em style={{ color: 'var(--text-secondary)' }}>"Add the [name] MCP server"</em>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Or see the{' '}
          <span
            style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => window.kode.github?.openDevicePage?.('https://modelcontextprotocol.io/integrations')}
          >
            MCP integrations directory
          </span>
        </p>
      </div>
    </div>
  )
}
