import React from 'react'
import { Plus, X } from 'lucide-react'
import { useTerminal } from '../../hooks/useTerminal'
import { XtermTerminal } from './XtermTerminal'

interface TerminalPanelProps {
  cwd?: string
}

export function TerminalPanel({ cwd }: TerminalPanelProps) {
  const { terminals, activeTermId, createTerminal, closeTerminal, setActiveTerminal } = useTerminal()

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: 32,
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    background: 'var(--bg-secondary)',
    overflowX: 'auto',
    overflowY: 'hidden'
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '0 8px 0 12px',
    height: '100%',
    fontSize: 12,
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    background: active ? 'var(--bg-primary)' : 'transparent',
    borderRight: '1px solid var(--border)',
    cursor: 'pointer',
    flexShrink: 0,
    userSelect: 'none',
    whiteSpace: 'nowrap'
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={tabBarStyle}>
        {terminals.map(t => (
          <div
            key={t.id}
            style={tabStyle(t.id === activeTermId)}
            onClick={() => setActiveTerminal(t.id)}
          >
            <span>{t.title}</span>
            <button
              aria-label={`close terminal ${t.title}`}
              onClick={e => { e.stopPropagation(); closeTerminal(t.id) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                border: 'none',
                borderRadius: 3,
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          aria-label="New Terminal"
          title="New Terminal"
          onClick={() => createTerminal(cwd)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Terminal area: all instances stay mounted; only active is visible */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        {terminals.length === 0 && (
          <div
            onClick={() => createTerminal(cwd)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Click to open a terminal{cwd ? ` in ${cwd.split(/[\\/]/).pop()}` : ''}
          </div>
        )}
        {terminals.map(t => (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              visibility: t.id === activeTermId ? 'visible' : 'hidden',
              pointerEvents: t.id === activeTermId ? 'auto' : 'none'
            }}
          >
            <XtermTerminal
              termId={t.id}
              isActive={t.id === activeTermId}
              onClose={() => closeTerminal(t.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
