import { useState, useEffect, useCallback } from 'react'
import { LogIn, LogOut, UserPlus, RefreshCw } from 'lucide-react'

interface Session {
  email: string
  name?: string
  plan?: string
}

interface UsageStats {
  today: number
  week: number
  allTime: number
}

const PLANS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function AccountSettings() {
  const [session, setSession] = useState<Session | null>(null)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const refreshStats = useCallback(async () => {
    try {
      const s = await window.kode.usage.getStats()
      setStats(s)
    } catch {
      // usage not available yet — ignore
    }
  }, [])

  useEffect(() => {
    window.kode.auth.getSession()
      .then(s => { if (s) setSession({ email: s.email, name: s.name, plan: s.plan }) })
      .catch(() => {})
      .finally(() => setCheckingSession(false))
    refreshStats()
  }, [refreshStats])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const fn = mode === 'login' ? window.kode.auth.login : window.kode.auth.signup
      const result = await fn(email.trim(), password)
      if (result.ok) {
        setSession({ email: result.email ?? email, name: result.name, plan: result.plan })
        setEmail('')
        setPassword('')
      } else {
        setError(result.error ?? 'Authentication failed')
      }
    } catch {
      setError('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [email, password, mode])

  const handleLogout = useCallback(async () => {
    await window.kode.auth.logout()
    setSession(null)
  }, [])

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    marginBottom: 4,
    display: 'block'
  }

  const input: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    fontSize: 12,
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  }

  if (checkingSession) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
        Checking session...
      </div>
    )
  }

  if (session) {
    return (
      <div>
        {/* User card */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 8,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {session.name ?? session.email}
              </div>
              {session.name && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {session.email}
                </div>
              )}
              {session.plan && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '2px 7px', borderRadius: 10,
                  background: session.plan === 'pro' ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.12)',
                  color: session.plan === 'pro' ? '#6366f1' : 'var(--text-muted)',
                  border: `1px solid ${session.plan === 'pro' ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`
                }}>
                  {PLANS[session.plan] ?? session.plan}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', fontSize: 11, borderRadius: 6,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0
              }}
            >
              <LogOut size={11} />
              Sign out
            </button>
          </div>
        </div>

        {/* Usage stats */}
        {stats && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10
            }}>
              Token Usage
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10, marginBottom: 8
            }}>
              {([
                { label: 'Today', value: stats.today },
                { label: 'This Week', value: stats.week },
                { label: 'All Time', value: stats.allTime }
              ] as const).map(({ label: l, value }) => (
                <div key={l} style={{
                  padding: '10px 12px', borderRadius: 6,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(value)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <button
              onClick={refreshStats}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', fontSize: 11, borderRadius: 5,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              <RefreshCw size={10} />
              Refresh
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
        Sign in to use Kode AI without your own API key. Alternatively, add an API key in the Chat settings panel.
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {(['login', 'signup'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null) }}
            style={{
              flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500,
              background: mode === m ? 'var(--kode-btn)' : 'transparent',
              color: mode === m ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            {m === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <span style={label}>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            required
            style={input}
          />
        </div>
        <div>
          <span style={label}>Password</span>
          <input
            type="password"
            placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            required
            style={input}
          />
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: '#c03030', padding: '7px 10px',
            background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.2)',
            borderRadius: 6
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 0', fontSize: 13, fontWeight: 500, borderRadius: 7,
            background: loading || !email.trim() || !password ? 'var(--kode-surface-2)' : 'var(--kode-btn)',
            color: loading || !email.trim() || !password ? 'var(--text-muted)' : 'var(--kode-btn-fg)',
            border: 'none', cursor: loading || !email.trim() || !password ? 'default' : 'pointer',
            fontFamily: 'inherit', width: '100%'
          }}
        >
          {mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
