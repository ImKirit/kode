import { useState, useEffect, useCallback, useRef } from 'react'
import { LogIn, LogOut, UserPlus, RefreshCw, Github, CheckCircle, Clock } from 'lucide-react'

interface KodeSession {
  email: string
  name?: string
  plan?: string
}

interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
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
  const [kodeSession, setKodeSession] = useState<KodeSession | null>(null)
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null)
  const [stats, setStats] = useState<UsageStats | null>(null)

  // Kode login form
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kodeLoading, setKodeLoading] = useState(false)
  const [kodeError, setKodeError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // GitHub Device Flow
  const [deviceFlow, setDeviceFlow] = useState<{
    userCode: string
    verificationUri: string
    deviceCode: string
    interval: number
  } | null>(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshStats = useCallback(async () => {
    try { setStats(await window.kode.usage.getStats()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    window.kode.auth.getSession()
      .then(s => { if (s) setKodeSession({ email: s.email, name: s.name, plan: s.plan }) })
      .catch(() => {})
      .finally(() => setCheckingSession(false))
    window.kode.github.getUser().then(u => { if (u) setGithubUser(u) }).catch(() => {})
    refreshStats()
  }, [refreshStats])

  // Poll for GitHub token after device flow starts
  const startPolling = useCallback((deviceCode: string, interval: number) => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(async () => {
      const res = await window.kode.github.pollDeviceToken(deviceCode)
      if (res.ok) {
        clearInterval(pollTimer.current!)
        pollTimer.current = null
        setDeviceFlow(null)
        setGithubLoading(false)
        // Re-fetch GitHub user
        const user = await window.kode.github.getUser()
        if (user) setGithubUser(user)
      } else if (res.error !== 'pending' && res.error !== 'slow_down') {
        clearInterval(pollTimer.current!)
        pollTimer.current = null
        setGithubLoading(false)
        setDeviceFlow(null)
        setGithubError(res.error ?? 'Authorization failed')
      }
    }, (interval + 1) * 1000)
  }, [])

  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current) }, [])

  const handleGithubSignIn = useCallback(async () => {
    setGithubLoading(true)
    setGithubError(null)
    const res = await window.kode.github.startDeviceFlow()
    if ('error' in res) {
      setGithubError(res.error)
      setGithubLoading(false)
      return
    }
    setDeviceFlow({
      userCode: res.userCode,
      verificationUri: res.verificationUri,
      deviceCode: res.deviceCode,
      interval: res.interval
    })
    startPolling(res.deviceCode, res.interval)
  }, [startPolling])

  const handleGithubSignOut = useCallback(async () => {
    await window.kode.github.clearToken()
    setGithubUser(null)
  }, [])

  const handleKodeSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setKodeLoading(true)
    setKodeError(null)
    try {
      const fn = mode === 'login' ? window.kode.auth.login : window.kode.auth.signup
      const result = await fn(email.trim(), password)
      if (result.ok) {
        setKodeSession({ email: result.email ?? email, name: result.name, plan: result.plan })
        setEmail('')
        setPassword('')
      } else {
        setKodeError(result.error ?? 'Authentication failed')
      }
    } catch {
      setKodeError('Unexpected error. Please try again.')
    } finally {
      setKodeLoading(false)
    }
  }, [email, password, mode])

  const handleKodeLogout = useCallback(async () => {
    await window.kode.auth.logout()
    setKodeSession(null)
  }, [])

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    letterSpacing: '0.04em', marginBottom: 4, display: 'block'
  }
  const input: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 12,
    background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit'
  }

  if (checkingSession) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>Checking session...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── GitHub Account (Copilot) ──────────────────────────────────── */}
      <section>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12
        }}>
          GitHub Account
        </div>

        {githubUser ? (
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: 'var(--bg-primary)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={githubUser.avatarUrl}
                  alt={githubUser.login}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {githubUser.name ?? githubUser.login}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{githubUser.login}</div>
                </div>
              </div>
              <button
                onClick={handleGithubSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', fontSize: 11, borderRadius: 6,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                <LogOut size={11} /> Sign out
              </button>
            </div>
            <div style={{
              marginTop: 10, padding: '7px 10px', borderRadius: 6,
              background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
              fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <CheckCircle size={11} />
              GitHub Copilot available — select it as your AI provider in Chat settings.
            </div>
          </div>
        ) : deviceFlow ? (
          <div style={{
            padding: '14px 16px', borderRadius: 8,
            background: 'var(--bg-primary)', border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Authorize Kode on GitHub
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
              Your browser has been opened to{' '}
              <a href="#" onClick={e => { e.preventDefault(); window.kode.github.openDevicePage(deviceFlow.verificationUri) }}
                style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                {deviceFlow.verificationUri}
              </a>.
              Enter this code when prompted:
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: 6,
              color: 'var(--text-primary)', padding: '12px 0', textAlign: 'center',
              background: 'var(--bg-sidebar)', borderRadius: 6, marginBottom: 12
            }}>
              {deviceFlow.userCode}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <Clock size={11} style={{ animation: 'spin 2s linear infinite', opacity: 0.7 }} />
              Waiting for authorization...
            </div>
            <button
              onClick={() => { setDeviceFlow(null); setGithubLoading(false); if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null } }}
              style={{
                marginTop: 12, padding: '5px 10px', fontSize: 11, borderRadius: 5,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
              Sign in with GitHub to use GitHub Copilot as your AI provider.
            </div>
            {githubError && (
              <div style={{ fontSize: 12, color: '#c03030', padding: '7px 10px', background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.2)', borderRadius: 6, marginBottom: 10 }}>
                {githubError}
              </div>
            )}
            <button
              onClick={handleGithubSignIn}
              disabled={githubLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', fontSize: 12, fontWeight: 500, borderRadius: 7,
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', cursor: githubLoading ? 'default' : 'pointer',
                fontFamily: 'inherit', opacity: githubLoading ? 0.6 : 1
              }}
            >
              <Github size={15} />
              {githubLoading ? 'Opening browser...' : 'Sign in with GitHub'}
            </button>
          </div>
        )}
      </section>

      {/* ── Kode Account (Subscription AI) ───────────────────────────── */}
      <section>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12
        }}>
          Kode Account
        </div>

        {kodeSession ? (
          <div>
            <div style={{
              padding: '14px 16px', borderRadius: 8,
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {kodeSession.name ?? kodeSession.email}
                  </div>
                  {kodeSession.name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{kodeSession.email}</div>}
                  {kodeSession.plan && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', marginTop: 6,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                      padding: '2px 7px', borderRadius: 10,
                      background: kodeSession.plan === 'pro' ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.12)',
                      color: kodeSession.plan === 'pro' ? '#6366f1' : 'var(--text-muted)',
                      border: `1px solid ${kodeSession.plan === 'pro' ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`
                    }}>
                      {PLANS[kodeSession.plan] ?? kodeSession.plan}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleKodeLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', fontSize: 11, borderRadius: 6,
                    background: 'none', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
                  }}
                >
                  <LogOut size={11} /> Sign out
                </button>
              </div>
            </div>

            {stats && (
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10
                }}>Token Usage</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
                  {([
                    { label: 'Today', value: stats.today },
                    { label: 'This Week', value: stats.week },
                    { label: 'All Time', value: stats.allTime }
                  ] as const).map(({ label: l, value }) => (
                    <div key={l} style={{
                      padding: '10px 12px', borderRadius: 6,
                      background: 'var(--bg-primary)', border: '1px solid var(--border)', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={refreshStats} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11,
                  borderRadius: 5, background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  <RefreshCw size={10} /> Refresh
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Sign in to use Kode AI without your own API key — your subscription covers the cost.
            </div>

            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {(['login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setKodeError(null) }} style={{
                  flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500,
                  background: mode === m ? 'var(--kode-btn)' : 'transparent',
                  color: mode === m ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <form onSubmit={handleKodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={label}>Email</span>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} disabled={kodeLoading} required style={input} />
              </div>
              <div>
                <span style={label}>Password</span>
                <input type="password" placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
                  value={password} onChange={e => setPassword(e.target.value)} disabled={kodeLoading} required style={input} />
              </div>

              {kodeError && (
                <div style={{ fontSize: 12, color: '#c03030', padding: '7px 10px', background: 'rgba(220,80,80,0.08)', border: '1px solid rgba(220,80,80,0.2)', borderRadius: 6 }}>
                  {kodeError}
                </div>
              )}

              <button type="submit" disabled={kodeLoading || !email.trim() || !password} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', fontSize: 13, fontWeight: 500, borderRadius: 7,
                background: kodeLoading || !email.trim() || !password ? 'var(--kode-surface-2)' : 'var(--kode-btn)',
                color: kodeLoading || !email.trim() || !password ? 'var(--text-muted)' : 'var(--kode-btn-fg)',
                border: 'none', cursor: kodeLoading || !email.trim() || !password ? 'default' : 'pointer',
                fontFamily: 'inherit', width: '100%'
              }}>
                {mode === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                {kodeLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  )
}
