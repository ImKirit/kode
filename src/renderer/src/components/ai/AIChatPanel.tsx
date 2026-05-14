import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, Settings, Eye, Send, Square, Clock, X } from 'lucide-react'
import { useScheduler } from '../../hooks/useScheduler'
import { useSettings } from '../../hooks/useSettings'
import { ChatMessage } from './ChatMessage'
import { ProviderSettings, PROVIDER_MODELS } from './ProviderSettings'
import { QueueDisplay } from './QueueDisplay'
import { PermissionDialog } from './PermissionDialog'
import type { ChatSession } from '../../types/electron'

type EffortLevel = 'normal' | 'think' | 'think-harder' | 'think-hardest'
type PermLevel = 'ask' | 'smart' | 'full'

const EFFORT_LEVELS: Array<{ value: EffortLevel; label: string; bars: number }> = [
  { value: 'normal',        label: 'Normal',        bars: 1 },
  { value: 'think',         label: 'Think',         bars: 2 },
  { value: 'think-harder',  label: 'Think Harder',  bars: 3 },
  { value: 'think-hardest', label: 'Think Hardest', bars: 4 }
]

const PERM_LEVELS: Array<{ value: PermLevel; label: string; desc: string }> = [
  { value: 'ask',   label: 'Ask',   desc: 'Confirm every tool call' },
  { value: 'smart', label: 'Smart', desc: 'Auto-approve reads, ask for writes' },
  { value: 'full',  label: 'Full',  desc: 'Approve all tools automatically' }
]

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
  onOpenAccountSettings?(): void
}

export function AIChatPanel({
  autoFollowEnabled, onToggleAutoFollow, systemPrompt, hasClaudeContext,
  currentSessionId, activeProvider = '', activeModel = '',
  onCreateSession, onSetSessionId, onSaveMessage, onOpenAccountSettings
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

  const [effort, setEffort] = useState<EffortLevel>('normal')
  const [perms, setPerms] = useState<PermLevel>('smart')
  const [showEffortMenu, setShowEffortMenu] = useState(false)
  const [showPermsMenu, setShowPermsMenu] = useState(false)
  const [weekTokens, setWeekTokens] = useState<number | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduledList, setScheduledList] = useState<Array<{ id: string; prompt: string; triggerAt: number }>>([])

  useEffect(() => {
    window.kode.usage?.getStats().then(s => setWeekTokens(s.week)).catch(() => {})
  }, [sessionTokens])

  // Listen for scheduled messages firing
  useEffect(() => {
    const un = window.kode.scheduler.onFire((prompt) => {
      sendOrEnqueue(prompt, systemPrompt)
    })
    return un
  }, [sendOrEnqueue, systemPrompt])

  const refreshScheduled = useCallback(async () => {
    const list = await window.kode.scheduler.list()
    setScheduledList(list)
  }, [])

  useEffect(() => { refreshScheduled() }, [refreshScheduled])

  const handleSchedule = useCallback(async () => {
    if (!input.trim() || !scheduleTime) return
    const [h, m] = scheduleTime.split(':').map(Number)
    const now = new Date()
    const target = new Date(now)
    target.setHours(h, m, 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)
    const id = `sched-${Date.now()}`
    await window.kode.scheduler.add(id, input.trim(), target.getTime())
    setInput('')
    setShowScheduler(false)
    setScheduleTime('')
    refreshScheduled()
  }, [input, scheduleTime, refreshScheduled])

  const handleCancelScheduled = useCallback(async (id: string) => {
    await window.kode.scheduler.cancel(id)
    refreshScheduled()
  }, [refreshScheduled])

  const isBlocked = isStreaming || retryCountdown !== null
  const displayModel = settings?.providers[settings.activeProvider]?.model ?? ''

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
          onOpenAccountSettings={() => { setShowSettings(false); onOpenAccountSettings?.() }}
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

      {/* Scheduler panel */}
      {showScheduler && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '10px 12px',
          background: 'var(--bg-primary)', flexShrink: 0
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em' }}>
            Schedule Message
          </div>
          {scheduledList.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {scheduledList.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                  background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 4,
                  border: '1px solid var(--border)'
                }}>
                  <Clock size={10} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {new Date(s.triggerAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.prompt}
                  </span>
                  <button onClick={() => handleCancelScheduled(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="time"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
              style={{
                padding: '5px 8px', fontSize: 12, borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
              {input.trim() ? `"${input.trim().slice(0, 30)}${input.length > 30 ? '…' : ''}"` : 'Type a message to schedule'}
            </span>
            <button
              onClick={handleSchedule}
              disabled={!input.trim() || !scheduleTime}
              style={{
                padding: '5px 10px', fontSize: 11, borderRadius: 6,
                background: input.trim() && scheduleTime ? 'var(--kode-btn)' : 'var(--kode-surface-2)',
                color: input.trim() && scheduleTime ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
                border: 'none', cursor: input.trim() && scheduleTime ? 'pointer' : 'default',
                fontFamily: 'inherit'
              }}
            >
              Schedule
            </button>
          </div>
        </div>
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
            gap: 5,
            padding: '5px 10px',
            borderTop: '1px solid var(--kode-border-dim)',
            position: 'relative'
          }}>
            {/* Model selector */}
            {settings && (PROVIDER_MODELS[settings.activeProvider] ?? []).length > 0 && (
              <select
                value={settings.providers[settings.activeProvider]?.model || PROVIDER_MODELS[settings.activeProvider]?.[0]?.id}
                onChange={e => setProviderModel(settings.activeProvider, e.target.value)}
                aria-label="Model"
                style={{
                  fontSize: 10, color: 'var(--text-muted)', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 8, padding: '2px 5px',
                  fontFamily: 'var(--font-editor)', flexShrink: 0, cursor: 'pointer',
                  outline: 'none', appearance: 'none', maxWidth: 100
                }}
              >
                {(PROVIDER_MODELS[settings.activeProvider] ?? []).map(m => (
                  <option key={m.id} value={m.id}>{m.id.split('-').slice(0, 3).join('-')}</option>
                ))}
              </select>
            )}

            {/* Effort pill */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => { setShowEffortMenu(v => !v); setShowPermsMenu(false) }}
                aria-label="Effort"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: showEffortMenu ? 'var(--kode-surface-2)' : 'transparent',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                  color: 'var(--text-muted)'
                }}
              >
                <span>Effort</span>
                <div style={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  {[1, 2, 3, 4].map(i => {
                    const filled = i <= (EFFORT_LEVELS.find(e => e.value === effort)?.bars ?? 1)
                    return (
                      <div key={i} style={{
                        width: 4, height: 8, borderRadius: 1,
                        background: filled ? 'var(--accent)' : 'var(--border)',
                        transition: 'background 0.15s'
                      }} />
                    )
                  })}
                </div>
              </button>
              {showEffortMenu && (
                <div
                  style={{
                    position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    zIndex: 200, minWidth: 160, overflow: 'hidden'
                  }}
                >
                  {EFFORT_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      onClick={() => { setEffort(lvl.value); setShowEffortMenu(false) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '7px 12px',
                        background: effort === lvl.value ? 'var(--kode-selection)' : 'transparent',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
                      }}
                    >
                      <span style={{ fontSize: 11, color: effort === lvl.value ? 'var(--accent)' : 'var(--text-primary)', fontWeight: effort === lvl.value ? 600 : 400 }}>
                        {lvl.label}
                      </span>
                      <div style={{ display: 'flex', gap: 1.5 }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            width: 4, height: 8, borderRadius: 1,
                            background: i <= lvl.bars ? 'var(--accent)' : 'var(--border)'
                          }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Perms pill */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => { setShowPermsMenu(v => !v); setShowEffortMenu(false) }}
                aria-label="Permissions"
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: showPermsMenu ? 'var(--kode-surface-2)' : 'transparent',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                  color: 'var(--text-muted)'
                }}
              >
                {PERM_LEVELS.find(p => p.value === perms)?.label ?? 'Ask'}
                <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
              </button>
              {showPermsMenu && (
                <div
                  style={{
                    position: 'absolute', bottom: 'calc(100% + 4px)', left: 0,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    zIndex: 200, minWidth: 200, overflow: 'hidden'
                  }}
                >
                  {PERM_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      onClick={() => { setPerms(lvl.value); setShowPermsMenu(false) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '7px 12px',
                        background: perms === lvl.value ? 'var(--kode-selection)' : 'transparent',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', flexDirection: 'column', gap: 2
                      }}
                    >
                      <span style={{ fontSize: 11, color: perms === lvl.value ? 'var(--accent)' : 'var(--text-primary)', fontWeight: perms === lvl.value ? 600 : 400 }}>
                        {lvl.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            {/* Schedule button */}
            <button
              onClick={() => setShowScheduler(v => !v)}
              aria-label="Schedule message"
              title="Schedule message"
              style={{
                background: showScheduler ? 'var(--kode-selection)' : 'transparent',
                border: `1px solid ${showScheduler ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, padding: '2px 8px', fontSize: 10,
                color: showScheduler ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
              }}
            >
              <Clock size={10} />
              {scheduledList.length > 0 ? `${scheduledList.length}` : ''}
            </button>

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
