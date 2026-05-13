import { ToolCallBlock } from './ToolCallBlock'
import type { ToolCallEntry } from '../../hooks/useScheduler'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming: boolean
  toolCalls?: ToolCallEntry[]
}

export function ChatMessage({ role, content, isStreaming, toolCalls }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      marginBottom: 16,
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start'
    }}>
      {/* Avatar */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: isUser ? 'var(--kode-btn)' : 'var(--kode-surface-2)',
        border: isUser ? 'none' : '1px solid var(--border)',
        color: isUser ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        flexShrink: 0,
        letterSpacing: '0.02em'
      }}>
        {isUser ? 'U' : 'A'}
      </div>

      {/* Content column */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: isUser ? 'flex-end' : 'flex-start'
      }}>
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontWeight: 500,
          letterSpacing: '0.04em'
        }}>
          {isUser ? 'You' : 'Assistant'}
        </span>

        <div style={{
          maxWidth: '90%',
          padding: '8px 12px',
          borderRadius: isUser
            ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
            : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
          background: isUser ? 'var(--kode-btn)' : 'var(--bg-primary)',
          color: isUser ? 'var(--kode-btn-fg)' : 'var(--text-primary)',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: isUser ? 'none' : '1px solid var(--border)'
        }}>
          {content}
          {!isUser && isStreaming && (
            <span
              data-testid="streaming-cursor"
              style={{
                display: 'inline-block',
                width: 2,
                height: '1em',
                background: 'var(--text-primary)',
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                animation: 'kode-blink 1s step-end infinite'
              }}
            />
          )}
        </div>

        {toolCalls && toolCalls.length > 0 && (
          <div style={{ width: '90%' }}>
            {toolCalls.map(tc => (
              <ToolCallBlock
                key={tc.callId}
                toolName={tc.toolName}
                serverId={tc.serverId}
                args={tc.args}
                status={tc.status}
                result={tc.result}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
