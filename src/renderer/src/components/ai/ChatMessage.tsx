interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming: boolean
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '8px 12px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser ? 'var(--accent)' : 'var(--bg-primary)',
        color: isUser ? '#fff' : 'var(--text-primary)',
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
    </div>
  )
}
