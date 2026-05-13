import { useState, useEffect, useCallback, useRef } from 'react'
import { GitBranch, RefreshCw, Upload, Download, CheckSquare, Square, Clock } from 'lucide-react'

interface FileEntry {
  path: string
  index: string
  workingDir: string
  staged: boolean
  modified: boolean
}

interface GitStatus {
  files: FileEntry[]
  ahead: number
  behind: number
  current: string | null
  tracking: string | null
}

interface CommitEntry {
  hash: string
  message: string
  author: string
  date: string
}

interface ChangesViewProps {
  rootPath: string | null
}

function statusColor(char: string): string {
  if (char === 'M') return '#f59e0b'
  if (char === 'A') return '#4ade80'
  if (char === 'D') return '#f87171'
  if (char === 'R') return '#a78bfa'
  if (char === '?') return '#60a5fa'
  return 'var(--text-muted)'
}

function statusLabel(char: string): string {
  if (char === 'M') return 'M'
  if (char === 'A') return 'A'
  if (char === 'D') return 'D'
  if (char === 'R') return 'R'
  if (char === '?') return 'U'
  return char
}

function fileName(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

function fileDirname(p: string): string {
  const parts = p.split(/[\\/]/)
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/') + '/'
}

export function ChangesView({ rootPath }: ChangesViewProps) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [diff, setDiff] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'changes' | 'history'>('changes')
  const [history, setHistory] = useState<CommitEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const rootRef = useRef(rootPath)
  rootRef.current = rootPath

  const refresh = useCallback(async () => {
    if (!rootPath) return
    setIsLoading(true)
    setError(null)
    try {
      const s = await window.kode.git.statusFull(rootPath)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [rootPath])

  useEffect(() => { refresh() }, [refresh])

  const loadHistory = useCallback(async () => {
    if (!rootPath) return
    setHistoryLoading(true)
    try {
      const log = await window.kode.git.log(rootPath, 30)
      setHistory(log)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [rootPath])

  useEffect(() => {
    if (activeTab === 'history') loadHistory()
  }, [activeTab, loadHistory])

  const selectFile = useCallback(async (filePath: string) => {
    if (!rootPath) return
    setSelectedFile(filePath)
    setError(null)
    try {
      let d = await window.kode.git.diff(rootPath, filePath)
      if (!d) d = await window.kode.git.diff(rootPath, filePath, true)
      setDiff(d)
    } catch {
      setDiff('')
    }
  }, [rootPath])

  const stage = useCallback(async (filePath: string) => {
    if (!rootPath) return
    try {
      await window.kode.git.stage(rootPath, filePath)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath, refresh])

  const unstage = useCallback(async (filePath: string) => {
    if (!rootPath) return
    try {
      await window.kode.git.unstage(rootPath, filePath)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath, refresh])

  const stageAll = useCallback(async () => {
    if (!rootPath) return
    try {
      await window.kode.git.stageAll(rootPath)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath, refresh])

  const commit = useCallback(async () => {
    if (!rootPath || !commitMessage.trim()) return
    try {
      await window.kode.git.commit(rootPath, commitMessage)
      setCommitMessage('')
      setSelectedFile(null)
      setDiff('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [rootPath, commitMessage, refresh])

  const push = useCallback(async () => {
    if (!rootPath) return
    setIsPushing(true)
    setError(null)
    try {
      await window.kode.git.push(rootPath)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsPushing(false)
    }
  }, [rootPath, refresh])

  const pull = useCallback(async () => {
    if (!rootPath) return
    setIsPulling(true)
    setError(null)
    try {
      await window.kode.git.pull(rootPath)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsPulling(false)
    }
  }, [rootPath, refresh])

  if (!rootPath) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Open a folder to see git changes</span>
      </div>
    )
  }

  const stagedFiles = status?.files.filter(f => f.staged) ?? []
  const unstagedFiles = status?.files.filter(f => !f.staged || f.modified) ?? []
  const totalChanges = status?.files.length ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      {/* Header: branch + sync buttons */}
      <div style={{
        padding: '0 10px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, height: 35
      }}>
        <GitBranch size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {status?.current ?? '—'}
          {status && (status.ahead > 0 || status.behind > 0) && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
              {status.ahead > 0 && `↑${status.ahead}`}
              {status.behind > 0 && ` ↓${status.behind}`}
            </span>
          )}
        </span>

        {/* Pull */}
        <button
          onClick={pull}
          disabled={isPulling}
          aria-label="Pull"
          title="Pull from remote"
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px',
            background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)'
          }}
        >
          <Download size={12} style={{ flexShrink: 0 }} />
          {isPulling ? '...' : 'Pull'}
        </button>

        {/* Push */}
        <button
          onClick={push}
          disabled={isPushing}
          aria-label="Push"
          title="Push to remote"
          style={{
            display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px',
            background: 'var(--kode-btn)', border: 'none', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontSize: 11, color: 'var(--kode-btn-fg)'
          }}
        >
          <Upload size={12} style={{ flexShrink: 0 }} />
          {isPushing ? '...' : 'Push'}
        </button>

        {/* Refresh */}
        <button onClick={refresh} aria-label="Refresh" title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3 }}>
          <RefreshCw size={13} style={{ opacity: isLoading ? 0.5 : 1 }} />
        </button>
      </div>

      {/* Sub-tabs: Changes | History */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-sidebar)'
      }}>
        {(['changes', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 14px', fontSize: 11, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--kode-btn)' : '2px solid transparent',
              textTransform: 'capitalize', letterSpacing: '0.03em'
            }}
          >
            {tab === 'changes' ? `Changes${totalChanges > 0 ? ` (${totalChanges})` : ''}` : 'History'}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '6px 12px', color: '#f87171', fontSize: 11, flexShrink: 0, background: 'rgba(248,113,113,0.08)' }}>
          {error}
        </div>
      )}

      {activeTab === 'history' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {historyLoading ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No commits yet</div>
          ) : history.map(c => (
            <div key={c.hash} style={{
              padding: '8px 12px', borderBottom: '1px solid var(--kode-border-dim)',
              display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', flexShrink: 0, paddingTop: 1 }}>{c.hash}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.message}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{c.author}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} />
                    {new Date(c.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* File list + diff */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            {/* File list */}
            <div style={{ width: 200, borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0 }}>
              {isLoading && !status && (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
              )}
              {!isLoading && totalChanges === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No changes</div>
              )}

              {/* Staged section */}
              {stagedFiles.length > 0 && (
                <>
                  <div style={{
                    padding: '5px 10px 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span>Staged ({stagedFiles.length})</span>
                  </div>
                  {stagedFiles.map(f => (
                    <FileRow
                      key={'staged-' + f.path}
                      file={f}
                      isSelected={selectedFile === f.path}
                      statusChar={f.index}
                      actionLabel="−"
                      actionTitle="Unstage"
                      onSelect={() => selectFile(f.path)}
                      onAction={() => unstage(f.path)}
                    />
                  ))}
                </>
              )}

              {/* Unstaged section */}
              {unstagedFiles.length > 0 && (
                <>
                  <div style={{
                    padding: '5px 10px 3px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span>Changes ({unstagedFiles.length})</span>
                    <button
                      onClick={stageAll}
                      title="Stage all"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 10, padding: '0 2px' }}
                    >
                      <CheckSquare size={11} />
                    </button>
                  </div>
                  {unstagedFiles.map(f => (
                    <FileRow
                      key={'unstaged-' + f.path}
                      file={f}
                      isSelected={selectedFile === f.path}
                      statusChar={f.workingDir !== ' ' && f.workingDir !== '' ? f.workingDir : f.index}
                      actionLabel="+"
                      actionTitle="Stage"
                      onSelect={() => selectFile(f.path)}
                      onAction={() => stage(f.path)}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Diff pane */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 0, fontSize: 12, fontFamily: 'var(--font-editor)' }}>
              {diff ? (
                <div>
                  {diff.split('\n').map((line, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0 12px',
                        background: line.startsWith('+') && !line.startsWith('+++') ? 'rgba(74,222,128,0.08)'
                          : line.startsWith('-') && !line.startsWith('---') ? 'rgba(248,113,113,0.08)'
                          : line.startsWith('@@') ? 'rgba(96,165,250,0.06)'
                          : 'transparent',
                        color: line.startsWith('+') && !line.startsWith('+++') ? '#4ade80'
                          : line.startsWith('-') && !line.startsWith('---') ? '#f87171'
                          : line.startsWith('@@') ? '#60a5fa'
                          : 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '20px', fontSize: 12
                      }}
                    >
                      {line || ' '}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedFile ? 'No diff available' : 'Select a file to view diff'}
                </div>
              )}
            </div>
          </div>

          {/* Commit bar */}
          <div style={{
            padding: '8px 10px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center'
          }}>
            <input
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit() }}
              placeholder="Commit message (Ctrl+Enter)..."
              aria-label="Commit message"
              style={{
                flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: 12,
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
              }}
            />
            <button
              onClick={commit}
              disabled={!commitMessage.trim() || stagedFiles.length === 0}
              aria-label="Commit staged changes"
              style={{
                background: stagedFiles.length > 0 && commitMessage.trim() ? 'var(--kode-btn)' : 'var(--border)',
                border: 'none', borderRadius: 'var(--radius-sm)', padding: '5px 12px',
                fontSize: 12, color: stagedFiles.length > 0 && commitMessage.trim() ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, fontWeight: 500
              }}
            >
              Commit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FileRow({ file, isSelected, statusChar, actionLabel, actionTitle, onSelect, onAction }: {
  file: FileEntry
  isSelected: boolean
  statusChar: string
  actionLabel: string
  actionTitle: string
  onSelect(): void
  onAction(): void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      style={{
        padding: '3px 10px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 5,
        background: isSelected ? 'var(--kode-selection)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--kode-btn)' : '2px solid transparent'
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <span style={{ color: statusColor(statusChar), fontSize: 11, fontWeight: 700, flexShrink: 0, width: 12, textAlign: 'center' }}>
        {statusLabel(statusChar)}
      </span>
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.path}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fileDirname(file.path)}</span>
        {fileName(file.path)}
      </span>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onAction() }}
        aria-label={actionTitle}
        title={actionTitle}
        style={{
          background: 'none', border: '1px solid var(--kode-border-dim)', borderRadius: 3,
          cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
          fontFamily: 'inherit', padding: '0 5px', marginLeft: 'auto', flexShrink: 0,
          lineHeight: 1.4
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
