import { useGit } from '../../hooks/useGit'

interface ChangesViewProps {
  rootPath: string | null
}

export function ChangesView({ rootPath }: ChangesViewProps) {
  const {
    files, diff, selectedFile, isLoading, commitMessage, error,
    refresh, selectFile, stage, commit, setCommitMessage
  } = useGit(rootPath)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div style={{
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, height: 35
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
          letterSpacing: '0.08em', textTransform: 'uppercase'
        }}>
          Changes
        </span>
        <button
          onClick={refresh}
          aria-label="Refresh changes"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', padding: '2px 6px'
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '6px 12px', color: '#f87171', fontSize: 12, flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* File list */}
        <div style={{
          width: 200, borderRight: '1px solid var(--border)',
          overflowY: 'auto', flexShrink: 0, background: 'var(--bg-sidebar)'
        }}>
          {isLoading && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
          )}
          {files.length === 0 && !isLoading && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No changes</div>
          )}
          {files.map(f => (
            <button
              key={f.path}
              data-testid={`change-file-${f.path}`}
              onClick={() => selectFile(f.path)}
              style={{
                width: '100%', textAlign: 'left', background: selectedFile === f.path ? 'var(--bg-primary)' : 'transparent',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px'
              }}
            >
              <span style={{ color: '#f59e0b', fontSize: 11, fontFamily: 'monospace', flexShrink: 0 }}>
                {f.status}
              </span>
              <span style={{
                fontSize: 12, color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {f.path.split(/[\\/]/).pop() ?? f.path}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); stage(f.path) }}
                aria-label={`Stage ${f.path}`}
                style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 3,
                  cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)',
                  fontFamily: 'inherit', padding: '1px 5px', marginLeft: 'auto', flexShrink: 0
                }}
              >
                +
              </button>
            </button>
          ))}
        </div>

        {/* Diff view */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {diff ? (
            <pre
              data-testid="diff-view"
              style={{ fontSize: 12, fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {diff.split('\n').map((line, i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    color: line.startsWith('+') && !line.startsWith('+++') ? '#4ade80'
                      : line.startsWith('-') && !line.startsWith('---') ? '#f87171'
                      : line.startsWith('@@') ? '#60a5fa'
                      : 'var(--text-secondary)'
                  }}
                >
                  {line}
                </span>
              ))}
            </pre>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select a file to view diff</div>
          )}
        </div>
      </div>

      {/* Commit area */}
      <div style={{
        padding: 8, borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, flexShrink: 0
      }}>
        <input
          value={commitMessage}
          onChange={e => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          aria-label="Commit message"
          style={{
            flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'inherit'
          }}
        />
        <button
          onClick={commit}
          disabled={!commitMessage.trim()}
          aria-label="Commit changes"
          style={{
            background: 'var(--accent)', border: 'none', borderRadius: 4, padding: '4px 12px',
            fontSize: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
          }}
        >
          Commit
        </button>
      </div>
    </div>
  )
}
