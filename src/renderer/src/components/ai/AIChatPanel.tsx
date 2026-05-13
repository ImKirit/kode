import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Settings, Eye, Send, Square } from 'lucide-react'
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
    pendingApproval, approveTool, denyTool, sessionTokens
  } = useScheduler()
  const { settings, setActiveProvider, setProviderKey, setProviderModel } = useSettings()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(currentSessionId ?? null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [input])

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

  const [weekTokens, setWeekTokens] = useState<number | null>(null)

  useEffect(() => {
    window.kode.usage?.getStats().then(s => setWeekTokens(s.week)).catch(() => {})
  }, [sessionTokens])

  const isBlocked = isStreaming || retryCountdown !== null
  const displayModel = settings?.providers[settings.activeProvider]?.model ?? ''
  const modelLabel = displayModel ? displayModel.split('-').slice(0, 3).join('-') : ''

  const contextWindow = displayModel.includes('gpt-4o') ? 128000
    : displayModel.includes('haiku') ? 200000
    : 200000
  const contextPct = Math.min(100, Math.round((sessionTokens / contextWindow) * 100))

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border)'
    }}>
      {/* Tab bar header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 12,
        paddingRight: 6,
        height: 36,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        {/* Chat tab (terra underline style) */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            paddingRight: 14,
            height: '100%',
            borderBottom: '2px solid var(--kode-btn)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.04em',
            gap: 6
          }}>
            Chat
            {hasClaudeContext && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--accent)',
                background: 'var(--kode-selection)',
                borderRadius: 3,
                padding: '1px 4px',
                letterSpacing: '0.06em'
              }}>
                .md
              </span>
            )}
          </div>
        </div>

        {/* Right icon buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <button
            onClick={() => setShowSettings(v => !v)}
            aria-label="Settings"
            title="Provider settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 5,
              borderRadius: 'var(--radius-sm)',
              color: showSettings ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Settings size={14} />
          </button>
          <button
            onClick={clearMessages}
            title="Clear conversation"
            aria-label="Clear"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 5,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Provider settings panel */}
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
        padding: '16px 14px 8px',
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
            background: 'rgba(220, 80, 80, 0.08)',
            border: '1px solid rgba(220, 80, 80, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: '#c03030'
          }}>
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Queue */}
      <QueueDisplay
        queue={queue}
        retryCountdown={retryCountdown}
        onRemove={removeFromQueue}
        onClearQueue={clearQueue}
      />

      {/* Permission dialog */}
      {pendingApproval && (
        <PermissionDialog
          {...pendingApproval}
          onAllow={() => approveTool(pendingApproval.callId)}
          onDeny={() => denyTool(pendingApproval.callId)}
        />
      )}

      {/* Boxed input */}
      <div style={{ padding: '10px 12px 12px', flexShrink: 0 }}>
        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-input)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <textarea
            ref={textareaRef}
            placeholder="Message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '10px 12px 6px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              maxHeight: 120,
              overflowY: 'auto'
            }}
          />

          {/* Pill bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderTop: '1px solid var(--kode-border-dim)'
          }}>
            {modelLabel && (
              <span style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                background: 'var(--kode-surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '2px 8px',
                fontFamily: 'var(--font-editor)',
                flexShrink: 0
              }}>
                {modelLabel}
              </span>
            )}

            <div style={{ flex: 1 }} />

            {/* Auto-follow toggle */}
            <button
              onClick={onToggleAutoFollow}
              aria-label="Auto Follow"
              aria-pressed={autoFollowEnabled}
              title={autoFollowEnabled ? 'Auto Follow: on' : 'Auto Follow: off'}
              style={{
                background: autoFollowEnabled ? 'var(--kode-btn)' : 'transparent',
                border: `1px solid ${autoFollowEnabled ? 'var(--kode-btn)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '2px 10px',
                fontSize: 10,
                color: autoFollowEnabled ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                transition: 'background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)'
              }}
            >
              <Eye size={10} />
              Follow
            </button>

            {/* Send / Stop */}
            {isBlocked ? (
              <button
                onClick={stop}
                aria-label="Stop"
                style={{
                  background: 'rgba(200, 50, 50, 0.1)',
                  border: '1px solid rgba(200, 50, 50, 0.3)',
                  borderRadius: 10,
                  padding: '2px 12px',
                  fontSize: 10,
                  color: '#b03030',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0
                }}
              >
                <Square size={9} />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                aria-label="Send"
                disabled={!input.trim()}
                style={{
                  background: input.trim() ? 'var(--kode-btn)' : 'var(--kode-surface-2)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '2px 12px',
                  fontSize: 10,
                  color: input.trim() ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
                  cursor: input.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  transition: 'background var(--transition-fast), color var(--transition-fast)'
                }}
              >
                <Send size={9} />
                Send
              </button>
            )}
          </div>
        </div>

        {/* Usage bar */}
        {(sessionTokens > 0 || weekTokens !== null) && (
          <div style={{
            padding: '4px 12px 6px',
            borderTop: '1px solid var(--kode-border-dim)',
            display: 'flex', flexDirection: 'column', gap: 4
          }}>
            {sessionTokens > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Context</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {sessionTokens.toLocaleString()} / {(contextWindow / 1000).toFixed(0)}k tokens ({contextPct}%)
                  </span>
                </div>
                <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${contextPct}%`,
                    background: contextPct > 85 ? '#f87171' : contextPct > 60 ? '#f59e0b' : 'var(--accent)',
                    borderRadius: 1,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </>
            )}
            {weekTokens !== null && weekTokens > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>This week</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {weekTokens >= 1_000_000
                    ? `${(weekTokens / 1_000_000).toFixed(1)}M`
                    : weekTokens >= 1_000
                      ? `${(weekTokens / 1_000).toFixed(1)}k`
                      : weekTokens.toLocaleString()} tokens
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
