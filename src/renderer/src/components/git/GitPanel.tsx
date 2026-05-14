import { useState, useEffect, useCallback } from 'react'
import { GitBranch, RefreshCw, Upload, Download, Plus, Check, AlertCircle } from 'lucide-react'

interface Branch {
  name: string
  current: boolean
}

interface LogEntry {
  hash: string
  message: string
  author: string
  date: string
}

interface GitPanelProps {
  rootPath: string | null
}

type OpStatus = { type: 'idle' } | { type: 'loading'; op: string } | { type: 'ok'; msg: string } | { type: 'error'; msg: string }

export function GitPanel({ rootPath }: GitPanelProps) {
  const [branch, setBranch] = useState<string>('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [hasRemote, setHasRemote] = useState(false)
  const [status, setStatus] = useState<OpStatus>({ type: 'idle' })
  const [showBranches, setShowBranches] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')

  const refresh = useCallback(async () => {
    if (!rootPath) return
    try {
      const [cur, bList, lList, remote] = await Promise.all([
        window.kode.git.currentBranch(rootPath).catch(() => ''),
        window.kode.git.branches(rootPath).catch(() => []),
        window.kode.git.log(rootPath, 10).catch(() => []),
        window.kode.git.hasRemote(rootPath).catch(() => false)
      ])
      setBranch(cur)
      setBranches(bList as Branch[])
      setLog(lList as LogEntry[])
      setHasRemote(remote as boolean)
    } catch {
      // not a git repo
    }
  }, [rootPath])

  useEffect(() => { refresh() }, [refresh])

  const runOp = useCallback(async (op: string, fn: () => Promise<unknown>) => {
    setStatus({ type: 'loading', op })
    try {
      await fn()
      setStatus({ type: 'ok', msg: `${op} successful` })
      await refresh()
      setTimeout(() => setStatus({ type: 'idle' }), 2500)
    } catch (e) {
      setStatus({ type: 'error', msg: String(e) })
      setTimeout(() => setStatus({ type: 'idle' }), 4000)
    }
  }, [refresh])

  const handlePull = () => runOp('Pull', () => window.kode.git.pull(rootPath!, 'origin', branch))
  const handlePush = () => runOp('Push', () => window.kode.git.push(rootPath!, 'origin', branch))
  const handleFetch = () => runOp('Fetch', () => window.kode.git.pull(rootPath!, 'origin', ''))

  const handleCheckout = async (name: string) => {
    if (!rootPath || name === branch) return
    setStatus({ type: 'loading', op: `Checkout ${name}` })
    try {
      await window.kode.terminal.spawn(80, 24, rootPath)
      // Can't directly checkout via existing IPC — fall back to messaging user
      setStatus({ type: 'ok', msg: `Use terminal: git checkout ${name}` })
    } catch {
      setStatus({ type: 'idle' })
    }
    setTimeout(() => setStatus({ type: 'idle' }), 3000)
  }

  if (!rootPath) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12 }}>
        No folder open
      </div>
    )
  }

  const btnStyle = (disabled?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', fontSize: 11, borderRadius: 6,
    background: disabled ? 'var(--kode-surface-2)' : 'var(--bg-sidebar)',
    border: '1px solid var(--border)', cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    fontFamily: 'inherit', fontWeight: 500,
    opacity: disabled ? 0.5 : 1
  })

  const isLoading = status.type === 'loading'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 12 }}>
      {/* Branch bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0
      }}>
        <GitBranch size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <button
          onClick={() => setShowBranches(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
            color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          {branch || '—'}
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>▾</span>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={refresh} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Branch picker */}
      {showBranches && (
        <div style={{
          borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)',
          padding: '8px 12px', flexShrink: 0, maxHeight: 160, overflowY: 'auto'
        }}>
          {branches.map(b => (
            <div
              key={b.name}
              onClick={() => { handleCheckout(b.name); setShowBranches(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                cursor: b.current ? 'default' : 'pointer',
                color: b.current ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: b.current ? 600 : 400
              }}
            >
              {b.current && <Check size={11} />}
              <span style={{ marginLeft: b.current ? 0 : 17 }}>{b.name}</span>
            </div>
          ))}
          {/* New branch input */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <input
              placeholder="new-branch"
              value={newBranchName}
              onChange={e => setNewBranchName(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              style={{
                flex: 1, padding: '3px 6px', fontSize: 11, borderRadius: 4,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
              }}
            />
            <button
              onClick={() => {
                if (newBranchName.trim()) {
                  setStatus({ type: 'ok', msg: `Use terminal: git checkout -b ${newBranchName.trim()}` })
                  setNewBranchName('')
                  setShowBranches(false)
                  setTimeout(() => setStatus({ type: 'idle' }), 3000)
                }
              }}
              title="Create branch"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <Plus size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <button
          onClick={handlePull}
          disabled={isLoading || !hasRemote}
          style={btnStyle(isLoading || !hasRemote)}
        >
          <Download size={11} /> Pull
        </button>
        <button
          onClick={handlePush}
          disabled={isLoading || !hasRemote}
          style={btnStyle(isLoading || !hasRemote)}
        >
          <Upload size={11} /> Push
        </button>
        <button
          onClick={handleFetch}
          disabled={isLoading || !hasRemote}
          style={btnStyle(isLoading || !hasRemote)}
        >
          <RefreshCw size={11} /> Fetch
        </button>
        {!hasRemote && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
            No remote
          </span>
        )}
      </div>

      {/* Status message */}
      {status.type !== 'idle' && (
        <div style={{
          padding: '6px 12px', flexShrink: 0,
          background: status.type === 'error' ? 'rgba(220,80,80,0.08)' : status.type === 'ok' ? 'rgba(74,222,128,0.08)' : 'var(--kode-surface-2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          {status.type === 'loading' && <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />}
          {status.type === 'ok' && <Check size={11} style={{ color: '#4ade80' }} />}
          {status.type === 'error' && <AlertCircle size={11} style={{ color: '#f87171' }} />}
          <span style={{ fontSize: 11, color: status.type === 'error' ? '#f87171' : status.type === 'ok' ? '#4ade80' : 'var(--text-muted)' }}>
            {status.type === 'loading' ? status.op + '...' : status.type !== 'idle' ? status.msg : ''}
          </span>
        </div>
      )}

      {/* Commit log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {log.length === 0 ? (
          <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>No commits yet</div>
        ) : log.map(entry => (
          <div key={entry.hash} style={{
            padding: '5px 12px', borderBottom: '1px solid var(--kode-border-dim)',
            display: 'flex', flexDirection: 'column', gap: 2
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {entry.message}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
              <code style={{ fontFamily: 'var(--font-editor)' }}>{entry.hash?.slice(0, 7)}</code>
              <span>{entry.author}</span>
              <span>{entry.date}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
