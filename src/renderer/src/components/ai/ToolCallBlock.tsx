import { useState } from 'react'
import type { ToolCallEntry } from '../../hooks/useScheduler'

interface ToolCallBlockProps {
  toolName: string
  serverId: string
  args: Record<string, unknown>
  status: ToolCallEntry['status']
  result?: string
}

const STATUS_COLORS: Record<ToolCallEntry['status'], string> = {
  pending: 'var(--text-muted)',
  success: '#4ade80',
  error: '#f87171',
  denied: '#fb923c'
}

const STATUS_LABELS: Record<ToolCallEntry['status'], string> = {
  pending: 'Pending',
  success: 'Success',
  error: 'Error',
  denied: 'Denied'
}

export function ToolCallBlock({ toolName, serverId, args, status, result }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--bg-sidebar)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 6,
      fontSize: 12,
      fontFamily: 'monospace',
      overflow: 'hidden'
    }}>
      <button
        role="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text-secondary)'
        }}
      >
        <span>{expanded ? '\u25bc' : '\u25b6'}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{toolName}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({serverId})</span>
        <span
          title={STATUS_LABELS[status]}
          style={{
            marginLeft: 'auto',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: STATUS_COLORS[status],
            flexShrink: 0,
            display: 'inline-block'
          }}
        />
      </button>
      {expanded && (
        <div style={{ padding: '0 8px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 11 }}>Args:</div>
          <pre style={{
            margin: '2px 0 6px',
            padding: '4px 6px',
            background: 'var(--bg-primary)',
            borderRadius: 4,
            overflowX: 'auto',
            fontSize: 11,
            color: 'var(--text-primary)'
          }}>
            {JSON.stringify(args, null, 2)}
          </pre>
          {result !== undefined && (
            <>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Result:</div>
              <pre style={{
                margin: '2px 0 0',
                padding: '4px 6px',
                background: 'var(--bg-primary)',
                borderRadius: 4,
                overflowX: 'auto',
                fontSize: 11,
                color: status === 'error' ? '#f87171' : 'var(--text-primary)'
              }}>
                {result}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
