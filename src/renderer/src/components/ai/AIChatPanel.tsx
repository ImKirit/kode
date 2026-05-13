import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Settings, Eye } from 'lucide-react'
import { useScheduler } from '../../hooks/useScheduler'
import { useSettings } from '../../hooks/useSettings'
import { ChatMessage } from './ChatMessage'
import { ProviderSettings } from './ProviderSettings'
import { QueueDisplay } from './QueueDisplay'
import { PermissionDialog } from './PermissionDialog'
import type { ChatSession } from '../../types/electron'

interface AIChatPanelProps {
  autoFollowEnabled: boolean
  onToggleAutoFollow(): void
  systemPrompt?: string
  hasClaudeContext?: boolean
  currentSessionId?: string | null
  activeProvider?: string
  activeModel?: string
  onCreateSession?(name: string, provider: string, model: string): Promise<ChatSession>
  onSetSessionId?(id: string): void
  onSaveMessage?(sessionId: string, role: string, content: string): Promise<void>
}

export function AIChatPanel({
  autoFollowEnabled, onToggleAutoFollow, systemPrompt, hasClaudeContext,
  currentSessionId, activeProvider = '', activeModel = '',
  onCreateSession, onSetSessionId, onSaveMessage
}: AIChatPanelProps) {
  const {
    messages, isStreaming, error, retryCountdown, queue,
    sendOrEnqueue, stop, clearMessages, removeFromQueue, clearQueue,
    pendingApproval, approveTool, denyTool
  } = useScheduler()
  const { settings, setActiveProvider, setProviderKey, setProviderModel } = useSettings()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(currentSessionId ?? null)

  useEffect(() => {
    sessionIdRef.current = currentSessionId ?? null
  }, [currentSessionId])

  const prevStreamingRef = useRef(false)

  useEffect(() => {
    const el = messagesEndRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && sessionIdRef.current && onSaveMessage) {
      const last = messages[messages.length - 1]
      if (last?.role === 'assistant' && last.content) {
        onSaveMessage(sessionIdRef.current, 'assistant', last.content).catch(() => {})
      }
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, messages, onSaveMessage])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    const text = input
    setInput('')

    let sid = sessionIdRef.current
    if (!sid && onCreateSession && onSetSessionId) {
      const truncated = text.slice(0, 40).trim()
      const session = await onCreateSession(truncated, activeProvider, activeModel)
      sid = session.id
      sessionIdRef.current = sid
      onSetSessionId(sid)
    }

    sendOrEnqueue(text, systemPrompt)

    if (sid && onSaveMessage) {
      onSaveMessage(sid, 'user', text).catch(() => {})
    }
  }, [input, sendOrEnqueue, systemPrompt, onCreateSession, onSetSessionId, onSaveMessage, activeProvider, activeModel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const isBlocked = isStreaming || retryCountdown !== null
  const displayModel = settings?.providers[settings.activeProvider]?.model ?? ''
  const modelLabel = displayModel.split('-').slice(0, 3).join('-')

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
          {displayModel && (
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
          {hasClaudeContext && (
            <span style={{
              fontSize: 10,
              color: '#fff',
              background: 'var(--accent)',
              borderRadius: 3,
              padding: '1px 5px',
              fontFamily: 'monospace',
              fontWeight: 600
            }}>
              CLAUDE.md
            </span>
          )}
          <button
            data-flat
            onClick={onToggleAutoFollow}
            aria-label="Auto Follow"
            aria-pressed={autoFollowEnabled}
            title={autoFollowEnabled ? 'Auto Follow: on' : 'Auto Follow: off'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: autoFollowEnabled ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Eye size={13} />
          </button>
          <button
            data-flat
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
            data-flat
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
            toolCalls={msg.toolCalls}
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

      {/* Queue + retry countdown */}
      <QueueDisplay
        queue={queue}
        retryCountdown={retryCountdown}
        onRemove={removeFromQueue}
        onClearQueue={clearQueue}
      />

      {/* Permission dialog for Ask mode */}
      {pendingApproval && (
        <PermissionDialog
          {...pendingApproval}
          onAllow={() => approveTool(pendingApproval.callId)}
          onDeny={() => denyTool(pendingApproval.callId)}
        />
      )}

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
            borderRadius: 'var(--radius-md)',
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
        {isBlocked ? (
          <button
            data-flat
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
