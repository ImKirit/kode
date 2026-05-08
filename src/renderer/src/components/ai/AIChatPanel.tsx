import { Bot } from 'lucide-react'

export function AIChatPanel() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        height: 35,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          AI Agent
        </span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24
      }}>
        <Bot
          size={36}
          strokeWidth={1.25}
          style={{ color: 'var(--text-muted)', opacity: 0.5 }}
        />
        <div style={{ textAlign: 'center', lineHeight: 1.7 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            AI Agent panel — coming in M3
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, opacity: 0.6 }}>
            Claude, GPT-4o, Gemini and more
          </p>
        </div>
      </div>
    </div>
  )
}
