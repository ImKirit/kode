import { useState, useEffect, useCallback } from 'react'
import { Github, CheckCircle, XCircle, Link, Unlink, Plus } from 'lucide-react'
import { CreateRepoDialog } from '../git/CreateRepoDialog'

interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
  publicRepos: number
}

interface GitHubRepo {
  id: number
  name: string
  fullName: string
  private: boolean
  cloneUrl: string
  description: string | null
}

interface LinkedRepo {
  owner: string
  repo: string
  fullName: string
  cloneUrl: string
  private: boolean
}

interface GitHubSettingsProps {
  currentFolder?: string | null
}

export function GitHubSettings({ currentFolder }: GitHubSettingsProps) {
  const [hasToken, setHasToken] = useState(false)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [linkedRepo, setLinkedRepo] = useState<LinkedRepo | null>(null)
  const [showRepoList, setShowRepoList] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')

  const loadState = useCallback(async () => {
    const connected = await window.kode.github.hasToken()
    setHasToken(connected)
    if (connected) {
      const u = await window.kode.github.getUser()
      setUser(u)
    }
    if (currentFolder) {
      const linked = await window.kode.github.getLinkedRepo(currentFolder)
      setLinkedRepo(linked)
    }
  }, [currentFolder])

  useEffect(() => { loadState() }, [loadState])

  const handleConnect = useCallback(async () => {
    if (!tokenInput.trim()) return
    setValidating(true)
    setTokenError(null)
    const result = await window.kode.github.validateToken(tokenInput.trim())
    if (result.valid && result.user) {
      await window.kode.github.setToken(tokenInput.trim())
      setHasToken(true)
      setUser(result.user)
      setTokenInput('')
    } else {
      setTokenError(result.error ?? 'Invalid token')
    }
    setValidating(false)
  }, [tokenInput])

  const handleDisconnect = useCallback(async () => {
    await window.kode.github.clearToken()
    setHasToken(false)
    setUser(null)
    setRepos([])
  }, [])

  const loadRepos = useCallback(async () => {
    setReposLoading(true)
    try {
      const list = await window.kode.github.listRepos()
      setRepos(list)
    } catch (e) {
      console.error(e)
    } finally {
      setReposLoading(false)
    }
  }, [])

  const handleShowRepos = useCallback(async () => {
    if (!showRepoList) {
      setShowRepoList(true)
      if (repos.length === 0) await loadRepos()
    } else {
      setShowRepoList(false)
    }
  }, [showRepoList, repos.length, loadRepos])

  const linkRepo = useCallback(async (r: GitHubRepo) => {
    if (!currentFolder) return
    const [owner, repo] = r.fullName.split('/')
    const entry: LinkedRepo = { owner, repo, fullName: r.fullName, cloneUrl: r.cloneUrl, private: r.private }
    await window.kode.github.setLinkedRepo(currentFolder, entry)
    setLinkedRepo(entry)
    setShowRepoList(false)
    // Set up git remote
    try {
      const token = '' // token is in main process; use HTTPS with token in URL pattern
      await window.kode.git.init(currentFolder)
      const remoteUrl = r.cloneUrl
      await window.kode.git.addRemote(currentFolder, 'origin', remoteUrl)
    } catch {
      // Remote may already exist - that's fine
    }
  }, [currentFolder])

  const handleUnlink = useCallback(async () => {
    if (!currentFolder) return
    await window.kode.github.unlinkRepo(currentFolder)
    setLinkedRepo(null)
  }, [currentFolder])

  const handleRepoCreated = useCallback(async (r: GitHubRepo) => {
    setCreateDialogOpen(false)
    if (currentFolder) await linkRepo(r)
    await loadRepos()
  }, [currentFolder, linkRepo, loadRepos])

  const filteredRepos = repos.filter(r =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(repoSearch.toLowerCase())
  )

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Github size={16} style={{ color: 'var(--text-secondary)' }} />
        <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          GitHub Account
        </h3>
      </div>

      {!hasToken ? (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Connect your GitHub account using a Personal Access Token. Create one at{' '}
            <span style={{ color: 'var(--accent)', fontFamily: 'monospace', fontSize: 11 }}>
              github.com/settings/tokens
            </span>{' '}
            with <code style={{ fontSize: 11 }}>repo</code> scope.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="password"
              value={tokenInput}
              onChange={e => { setTokenInput(e.target.value); setTokenError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
              placeholder="ghp_..."
              style={{
                flex: 1, background: 'var(--bg-input)', border: `1px solid ${tokenError ? '#f87171' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12,
                color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace'
              }}
            />
            <button
              onClick={handleConnect}
              disabled={validating || !tokenInput.trim()}
              style={{
                background: 'var(--kode-btn)', border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '6px 14px', fontSize: 12, color: 'var(--kode-btn-fg)',
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0
              }}
            >
              {validating ? 'Checking...' : 'Connect'}
            </button>
          </div>
          {tokenError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#f87171', fontSize: 12 }}>
              <XCircle size={13} />
              {tokenError}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 12 }}>
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.login ?? '...'}</span>
              </div>
              {user?.name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.name} · {user.publicRepos} public repos</div>}
            </div>
            <button
              onClick={handleDisconnect}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '4px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Folder-Repo linking */}
      {currentFolder && (
        <>
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Linked Repository
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Folder: <code style={{ fontSize: 11 }}>{currentFolder.split(/[\\/]/).pop()}</code>
          </p>

          {linkedRepo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 10 }}>
              <Link size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{linkedRepo.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{linkedRepo.private ? 'Private' : 'Public'}</div>
              </div>
              <button
                onClick={handleUnlink}
                title="Unlink repository"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              >
                <Unlink size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {hasToken && (
                <>
                  <button
                    onClick={handleShowRepos}
                    style={{
                      flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '7px 12px', fontSize: 12,
                      color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    {showRepoList ? 'Cancel' : 'Link existing repo...'}
                  </button>
                  <button
                    onClick={() => setCreateDialogOpen(true)}
                    title="Create new repository"
                    style={{
                      background: 'var(--kode-btn)', border: 'none', borderRadius: 'var(--radius-sm)',
                      padding: '7px 10px', fontSize: 12, color: 'var(--kode-btn-fg)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <Plus size={13} />
                    New
                  </button>
                </>
              )}
              {!hasToken && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect GitHub to link a repository.</p>
              )}
            </div>
          )}

          {showRepoList && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                <input
                  autoFocus
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  placeholder="Search repositories..."
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 12, color: 'var(--text-primary)', fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {reposLoading ? (
                  <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
                ) : filteredRepos.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No repositories found</div>
                ) : filteredRepos.map(r => (
                  <div
                    key={r.id}
                    onClick={() => linkRepo(r)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') linkRepo(r) }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--kode-border-dim)'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--kode-selection)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{r.fullName}</div>
                    {r.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.description}</div>}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 3, marginTop: 3, display: 'inline-block' }}>
                      {r.private ? 'Private' : 'Public'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {createDialogOpen && (
        <CreateRepoDialog
          onClose={() => setCreateDialogOpen(false)}
          onCreate={handleRepoCreated}
        />
      )}
    </div>
  )
}
