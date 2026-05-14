import { useState, useEffect, useCallback, useRef } from 'react'

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

interface BuiltinPlugin {
  id: string
  name: string
  category: string
  description: string
}

const BUILTIN_PLUGINS: BuiltinPlugin[] = [
  {
    id: 'kode-monaco',
    name: 'Monaco Editor',
    category: 'Editor',
    description: 'VS Code-grade editor with syntax highlighting, IntelliSense, and multi-cursor editing.'
  },
  {
    id: 'kode-emmet',
    name: 'Emmet',
    category: 'Productivity',
    description: 'Lightning-fast HTML and CSS abbreviation expansion in the editor.'
  },
  {
    id: 'kode-terminal',
    name: 'Terminal',
    category: 'Productivity',
    description: 'Integrated shell powered by node-pty, spawned from your project root.'
  },
  {
    id: 'kode-git',
    name: 'Git Integration',
    category: 'Git',
    description: 'Branch picker, push, pull, fetch, and commit log in the bottom panel.'
  },
  {
    id: 'kode-ai',
    name: 'AI Chat',
    category: 'AI',
    description: 'Claude-powered assistant with tool calls, scheduling, and .kode.md context.'
  }
]

const categoryColor: Record<string, string> = {
  Server:      '#4ade80',
  Formatter:   '#6366f1',
  Linter:      '#f59e0b',
  Git:         '#f87171',
  Productivity:'#22d3ee',
  Snippets:    '#a78bfa',
  Editor:      '#6366f1',
  AI:          '#a78bfa'
}

export function PluginBrowser({ rootPath: _rootPath }: { rootPath?: string | null }) {
  const [installed, setInstalled] = useState<PluginMeta[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshInstalled = useCallback(async () => {
    const list = await window.kode.plugins.list() as PluginMeta[]
    setInstalled(list)
  }, [])

  useEffect(() => {
    refreshInstalled()
  }, [refreshInstalled])

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
          {BUILTIN_PLUGINS.map(plugin => {
            const color = categoryColor[plugin.category] ?? 'var(--text-muted)'
            return (
              <div key={plugin.id} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{plugin.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '1px 5px', borderRadius: 4,
                      background: color + '22', color,
                      border: `1px solid ${color}55`
                    }}>{plugin.category}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                    {plugin.description}
                  </div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', flexShrink: 0 }}>
                  built-in
                </span>
              </div>
            )
          })}
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
