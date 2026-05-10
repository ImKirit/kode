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
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg)',
        background: isUser ? 'var(--accent)' : 'var(--bg-sidebar)',
        color: isUser ? '#ffffff' : 'var(--text-primary)',
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: isUser ? 'none' : '1px solid var(--border)',
        alignSelf: isUser ? 'flex-end' : 'flex-start'
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
        <div style={{ alignSelf: 'flex-start', width: '80%' }}>
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
  )
}
