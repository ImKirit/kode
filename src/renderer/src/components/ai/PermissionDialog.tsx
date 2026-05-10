import { useEffect } from 'react'
import type { ToolApprovalRequest } from '../../hooks/useScheduler'

interface PermissionDialogProps extends ToolApprovalRequest {
  onAllow(): void
  onDeny(): void
}

export function PermissionDialog({ toolName, serverId, args, onAllow, onDeny }: PermissionDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onAllow()
      if (e.key === 'Escape') onDeny()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onAllow, onDeny])

  return (
    <>
      <div
        onClick={onDeny}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}
      />
      <div
        role="dialog"
        aria-label="Tool permission request"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 420,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          zIndex: 1001,
          padding: 20
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          Allow tool call?
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{toolName}</span>
          {' '}from{' '}
          <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{serverId}</span>
        </div>
        <pre style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'var(--text-primary)',
          marginBottom: 16,
          overflowX: 'auto',
          maxHeight: 150,
          overflowY: 'auto'
        }}>
          {JSON.stringify(args, null, 2)}
        </pre>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            data-flat=""
            onClick={onDeny}
            style={{
              padding: '6px 14px', fontSize: 13,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            Deny
          </button>
          <button
            onClick={onAllow}
            style={{
              padding: '6px 14px', fontSize: 13,
              background: 'var(--accent)', border: 'none',
              borderRadius: 6, cursor: 'pointer',
              color: '#fff', fontWeight: 500
            }}
          >
            Allow
          </button>
        </div>
      </div>
    </>
  )
}
