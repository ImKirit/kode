import { useState, useEffect, useCallback, useRef } from 'react'
import { Server, RefreshCw, ExternalLink } from 'lucide-react'

interface PluginMeta {
  id: string
  name: string
  version: string
  description: string
  installed: boolean
}

interface PluginSearchResult {
  id: string
  name: string
  description: string
  version: string
  downloads?: number
}

interface LiveServerStatus {
  running: boolean
  port?: number
}

const categoryColor: Record<string, string> = {
  Server:      '#4ade80',
  Formatter:   '#6366f1',
  Linter:      '#f59e0b',
  Git:         '#f87171',
  Productivity:'#22d3ee',
  Snippets:    '#a78bfa'
}

export function PluginBrowser({ rootPath }: { rootPath?: string | null }) {
  const [installed, setInstalled] = useState<PluginMeta[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [liveServer, setLiveServer] = useState<LiveServerStatus>({ running: false })
  const [liveServerLoading, setLiveServerLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshInstalled = useCallback(async () => {
    const list = await window.kode.plugins.list() as PluginMeta[]
    setInstalled(list)
  }, [])

  const refreshLiveServer = useCallback(async () => {
    const s = await window.kode.liveServer.status()
    setLiveServer(s)
  }, [])

  useEffect(() => {
    refreshInstalled()
    refreshLiveServer()
  }, [refreshInstalled, refreshLiveServer])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const results = await window.kode.plugins.search(searchQuery) as PluginSearchResult[]
      setSearchResults(results)
      setSearching(false)
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  const handleInstall = useCallback(async (id: string) => {
    setLoadingId(id)
    try {
      await window.kode.plugins.install(id)
      await refreshInstalled()
    } catch (e) {
      console.error('Install failed:', e)
    } finally {
      setLoadingId(null)
    }
  }, [refreshInstalled])

  const handleUninstall = useCallback(async (id: string) => {
    setLoadingId(id)
    try {
      await window.kode.plugins.uninstall(id)
      await refreshInstalled()
    } finally {
      setLoadingId(null)
    }
  }, [refreshInstalled])

  const handleToggleLiveServer = useCallback(async () => {
    setLiveServerLoading(true)
    try {
      if (liveServer.running) {
        await window.kode.liveServer.stop()
        setLiveServer({ running: false })
      } else {
        const res = await window.kode.liveServer.start(rootPath ?? '', 5500)
        if (res.ok) {
          setLiveServer({ running: true, port: res.port })
        } else {
          alert(res.error ?? 'Failed to start Live Server')
        }
      }
    } finally {
      setLiveServerLoading(false)
    }
  }, [liveServer.running, rootPath])

  const installedIds = new Set(installed.map(p => p.id))
  const isSearching = !!searchQuery.trim()

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: 8, marginTop: 20
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 0', borderBottom: '1px solid var(--border)'
  }
  const btnBase: React.CSSProperties = {
    flexShrink: 0, padding: '4px 10px', fontSize: 11,
    borderRadius: 5, cursor: 'pointer', border: '1px solid var(--border)'
  }

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
        Extensions
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Built-in features and npm packages tagged <code style={{ fontFamily: 'monospace', fontSize: 11 }}>kode-plugin</code>.
      </div>

      {/* Search */}
      <input
        placeholder="Search marketplace (e.g. prettier, eslint)..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{
          width: '100%', padding: '7px 10px', fontSize: 12,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 6, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
        }}
      />

      {/* Search results */}
      {isSearching && (
        <>
          <div style={sectionLabel}>Marketplace Results</div>
          {searching ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Searching npm...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
              No packages found. Publish to npm with the <code style={{ fontFamily: 'monospace', fontSize: 11 }}>kode-plugin</code> keyword.
            </div>
          ) : searchResults.map(pkg => {
            const isInst = installedIds.has(pkg.id)
            const isLoading = loadingId === pkg.id
            return (
              <div key={pkg.id} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{pkg.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pkg.description}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    v{pkg.version}{pkg.downloads != null && ` · ${pkg.downloads.toLocaleString()} downloads/mo`}
                  </div>
                </div>
                {!isInst ? (
                  <button onClick={() => handleInstall(pkg.id)} disabled={isLoading || loadingId !== null}
                    style={{ ...btnBase, background: isLoading ? 'var(--bg-sidebar)' : 'var(--accent)', color: isLoading ? 'var(--text-muted)' : '#fff', borderColor: isLoading ? 'var(--border)' : 'var(--accent)' }}>
                    {isLoading ? 'Installing...' : 'Install'}
                  </button>
                ) : (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                    installed
                  </span>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Built-in extensions */}
      {!isSearching && (
        <>
          <div style={sectionLabel}>Built-in</div>

          {/* Live Server */}
          <div style={row}>
            <div style={{
              width: 32, height: 32, borderRadius: 6, flexShrink: 0,
              background: liveServer.running ? 'rgba(74,222,128,0.12)' : 'rgba(148,163,184,0.08)',
              border: `1px solid ${liveServer.running ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Server size={15} color={liveServer.running ? '#4ade80' : 'var(--text-muted)'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Live Server</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '1px 5px', borderRadius: 4,
                  background: categoryColor.Server + '22', color: categoryColor.Server,
                  border: `1px solid ${categoryColor.Server}55`
                }}>Server</span>
                {liveServer.running && liveServer.port && (
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); window.kode.liveServer.start(rootPath ?? '', liveServer.port) }}
                    style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                  >
                    <ExternalLink size={9} />
                    localhost:{liveServer.port}
                  </a>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                Launch a local HTTP server with live reload. Changes to your files automatically refresh the browser.
              </div>
            </div>
            <button
              onClick={handleToggleLiveServer}
              disabled={liveServerLoading}
              style={{
                ...btnBase,
                background: liveServer.running ? 'rgba(248,113,113,0.08)' : 'none',
                color: liveServerLoading ? 'var(--text-muted)' : liveServer.running ? '#f87171' : 'var(--accent)',
                borderColor: liveServer.running ? 'rgba(248,113,113,0.3)' : 'var(--accent)'
              }}
            >
              {liveServerLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> Working...
                </span>
              ) : liveServer.running ? 'Stop' : 'Start'}
            </button>
          </div>
        </>
      )}

      {/* Installed npm plugins */}
      {!isSearching && (
        <>
          <div style={sectionLabel}>Installed</div>
          {installed.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              No npm plugins installed yet. Search above to find and install packages.
            </div>
          ) : installed.map(pkg => {
            const isLoading = loadingId === pkg.id
            return (
              <div key={pkg.id} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{pkg.name}</div>
                  {pkg.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pkg.description}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>v{pkg.version}</div>
                </div>
                <button
                  onClick={() => handleUninstall(pkg.id)}
                  disabled={isLoading || loadingId !== null}
                  style={{ ...btnBase, background: 'none', color: isLoading ? 'var(--text-muted)' : '#f87171' }}
                >
                  {isLoading ? 'Removing...' : 'Uninstall'}
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
