import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Settings } from 'lucide-react'
import { useAIChat } from '../../hooks/useAIChat'
import { useSettings } from '../../hooks/useSettings'
import { ChatMessage } from './ChatMessage'
import { ProviderSettings } from './ProviderSettings'

export function AIChatPanel() {
  const { messages, isStreaming, error, sendMessage, stop, clearMessages } = useAIChat()
  const { settings, setActiveProvider, setProviderKey, setProviderModel } = useSettings()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const activeModel = settings?.providers[settings.activeProvider]?.model ?? ''
  const modelLabel = activeModel.split('-').slice(0, 3).join('-')

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
        padding: '0 10px 0 14px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeModel && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '1px 5px'
            }}>
              {modelLabel}
            </span>
          )}
          <button
            onClick={() => setShowSettings(v => !v)}
            aria-label="Settings"
            title="Provider settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: showSettings ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings size={13} />
          </button>
          <button
            onClick={clearMessages}
            title="Clear conversation"
            aria-label="Clear"
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
      </div>

      {/* Provider settings panel (collapsible) */}
      {showSettings && settings && (
        <ProviderSettings
          settings={settings}
          onSetActiveProvider={setActiveProvider}
          onSetProviderKey={setProviderKey}
          onSetProviderModel={setProviderModel}
          onClose={() => setShowSettings(false)}
        />
      )}

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
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            aria-label="Send"
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              flexShrink: 0
            }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
