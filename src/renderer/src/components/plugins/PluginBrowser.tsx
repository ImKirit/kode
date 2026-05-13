import { useState, useEffect, useCallback } from 'react'

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

interface FeaturedPlugin {
  id: string
  name: string
  description: string
  category: string
  preview?: true
}

const FEATURED: FeaturedPlugin[] = [
  {
    id: 'kode-prettier',
    name: 'kode-prettier',
    description: 'Auto-format on save with Prettier — supports JS, TS, CSS, HTML, JSON, Markdown.',
    category: 'Formatter'
  },
  {
    id: 'kode-eslint',
    name: 'kode-eslint',
    description: 'Inline ESLint diagnostics and quick-fixes for JavaScript and TypeScript.',
    category: 'Linter'
  },
  {
    id: 'kode-git-blame',
    name: 'kode-git-blame',
    description: 'Show git blame annotations inline next to each line in the editor.',
    category: 'Git'
  },
  {
    id: 'kode-todo-highlight',
    name: 'kode-todo-highlight',
    description: 'Highlight TODO, FIXME, HACK, and NOTE comments with configurable colors.',
    category: 'Productivity'
  },
  {
    id: 'kode-snippets-react',
    name: 'kode-snippets-react',
    description: 'React and TypeScript snippet pack: components, hooks, context, and more.',
    category: 'Snippets'
  },
  {
    id: 'kode-color-picker',
    name: 'kode-color-picker',
    description: 'Inline color picker and preview for CSS color values.',
    category: 'Productivity'
  }
]

const categoryColor: Record<string, string> = {
  Formatter: '#6366f1',
  Linter: '#f59e0b',
  Git: '#f87171',
  Productivity: '#4ade80',
  Snippets: '#22d3ee'
}

export function PluginBrowser() {
  const [installed, setInstalled] = useState<PluginMeta[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const refreshInstalled = useCallback(async () => {
    const list = await window.kode.plugins.list()
    setInstalled(list)
  }, [])

  useEffect(() => {
    refreshInstalled()
  }, [refreshInstalled])

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      const results = await window.kode.plugins.search(searchQuery)
      setSearchResults(results)
      setSearching(false)
    }, 300)
    setSearchTimeout(t)
    return () => clearTimeout(t)
  }, [searchQuery])

  const handleInstall = useCallback(async (id: string) => {
    setLoadingId(id)
    try {
      await window.kode.plugins.install(id)
      await refreshInstalled()
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

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 8,
    marginTop: 20
  }

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid var(--border)'
  }

  const btnBase: React.CSSProperties = {
    flexShrink: 0,
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 5,
    cursor: 'pointer',
    border: '1px solid var(--border)'
  }

  const isSearching = !!searchQuery.trim()

  return (
    <div style={{ padding: '16px 20px', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
        Plugin Marketplace
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Install extensions tagged with <code style={{ fontFamily: 'monospace', fontSize: 11 }}>kode-plugin</code> from npm.
      </div>

      {/* Search */}
      <input
        placeholder="Search plugins (e.g. prettier, eslint)..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '7px 10px',
          fontSize: 12,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {/* Search Results */}
      {isSearching && (
        <>
          <div style={sectionLabel}>Results</div>
          {searching ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Searching npm...</div>
          ) : searchResults.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
              No packages found. Plugins must be published to npm with the <code style={{ fontFamily: 'monospace', fontSize: 11 }}>kode-plugin</code> keyword.
            </div>
          ) : (
            searchResults.map(pkg => {
              const isInstalled = installedIds.has(pkg.id)
              const isLoading = loadingId === pkg.id
              return (
                <div key={pkg.id} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {pkg.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {pkg.description}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      v{pkg.version}
                      {pkg.downloads != null && ` · ${pkg.downloads.toLocaleString()} downloads/mo`}
                    </div>
                  </div>
                  {!isInstalled ? (
                    <button
                      onClick={() => handleInstall(pkg.id)}
                      disabled={isLoading || loadingId !== null}
                      style={{
                        ...btnBase,
                        background: isLoading ? 'var(--bg-sidebar)' : 'var(--accent)',
                        color: isLoading ? 'var(--text-muted)' : '#fff',
                        borderColor: isLoading ? 'var(--border)' : 'var(--accent)'
                      }}
                    >
                      {isLoading ? 'Installing...' : 'Install'}
                    </button>
                  ) : (
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(74,222,128,0.1)', color: '#4ade80',
                      border: '1px solid rgba(74,222,128,0.3)'
                    }}>
                      installed
                    </span>
                  )}
                </div>
              )
            })
          )}
        </>
      )}

      {/* Featured (shown when not searching) */}
      {!isSearching && (
        <>
          <div style={sectionLabel}>Featured</div>
          {FEATURED.map(plugin => {
            const isInstalled = installedIds.has(plugin.id)
            const isLoading = loadingId === plugin.id
            const color = categoryColor[plugin.category] ?? 'var(--accent)'
            return (
              <div key={plugin.id} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {plugin.name}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                      padding: '1px 5px', borderRadius: 4,
                      background: color + '22', color, border: `1px solid ${color}55`
                    }}>
                      {plugin.category}
                    </span>
                    {plugin.preview && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                        padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(148,163,184,0.12)', color: 'var(--text-muted)',
                        border: '1px solid var(--border)'
                      }}>
                        Preview
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                    {plugin.description}
                  </div>
                </div>
                {!isInstalled ? (
                  <button
                    onClick={() => handleInstall(plugin.id)}
                    disabled={isLoading || loadingId !== null}
                    title="Installs from npm — the package must be published first"
                    style={{
                      ...btnBase,
                      background: 'none',
                      color: isLoading ? 'var(--text-muted)' : 'var(--accent)',
                      borderColor: isLoading ? 'var(--border)' : 'var(--accent)'
                    }}
                  >
                    {isLoading ? 'Installing...' : 'Install'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUninstall(plugin.id)}
                    disabled={isLoading || loadingId !== null}
                    style={{
                      ...btnBase,
                      background: 'none',
                      color: isLoading ? 'var(--text-muted)' : '#f87171'
                    }}
                  >
                    {isLoading ? 'Removing...' : 'Uninstall'}
                  </button>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Installed plugins */}
      <div style={sectionLabel}>Installed</div>
      {installed.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          No plugins installed yet.{' '}
          {isSearching ? 'Click Install on a search result above.' : 'Search above or pick a featured plugin to get started.'}
        </div>
      ) : (
        installed.map(pkg => {
          const isLoading = loadingId === pkg.id
          return (
            <div key={pkg.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {pkg.name}
                </div>
                {pkg.description && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{pkg.description}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>v{pkg.version}</div>
              </div>
              <button
                onClick={() => handleUninstall(pkg.id)}
                disabled={isLoading || loadingId !== null}
                style={{
                  ...btnBase,
                  background: 'none',
                  color: isLoading ? 'var(--text-muted)' : '#f87171'
                }}
              >
                {isLoading ? 'Removing...' : 'Uninstall'}
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
