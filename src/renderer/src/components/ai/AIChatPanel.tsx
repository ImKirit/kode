import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { useAIChat } from '../../hooks/useAIChat'
import { ChatMessage } from './ChatMessage'

export function AIChatPanel() {
  const { messages, isStreaming, error, apiKey, setApiKey, sendMessage, stop, clearMessages } = useAIChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    const el = messagesEndRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }, [input, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

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
        <button
          onClick={clearMessages}
          title="Clear conversation"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* API Key input */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <input
          type="password"
          placeholder="Anthropic API key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px 4px',
        minHeight: 0
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: 12,
            opacity: 0.6
          }}>
            Start a conversation
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={`${msg.role}-${i}`}
            role={msg.role}
            content={msg.content}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {error && (
          <div style={{
            padding: '6px 10px',
            marginBottom: 8,
            background: 'rgba(220, 80, 80, 0.12)',
            border: '1px solid rgba(220, 80, 80, 0.3)',
            borderRadius: 6,
            fontSize: 12,
            color: '#f87171'
          }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end'
      }}>
        <textarea
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: 'auto'
          }}
        />
        {isStreaming ? (
          <button
            onClick={stop}
            aria-label="Stop"
            style={{
              background: 'rgba(220, 80, 80, 0.15)',
              border: '1px solid rgba(220, 80, 80, 0.4)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: '#f87171',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label="Send"
            style={{
              background: input.trim() ? 'var(--accent)' : 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: input.trim() ? '#fff' : 'var(--text-muted)',
              cursor: input.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.15s'
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
