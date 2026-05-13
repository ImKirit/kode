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

export function PluginBrowser() {
  const [installed, setInstalled] = useState<PluginMeta[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PluginSearchResult[]>([])
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
      return
    }
    const t = setTimeout(async () => {
      const results = await window.kode.plugins.search(searchQuery)
      setSearchResults(results)
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
    marginTop: 16
  }

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 0',
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

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
        Plugin Marketplace
      </div>

      {/* Search */}
      <input
        placeholder="Search plugins..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
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
      {searchQuery.trim() && searchResults.length > 0 && (
        <>
          <div style={sectionLabel}>Results</div>
          {searchResults.map(pkg => {
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
                {!isInstalled && (
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
                )}
                {isInstalled && (
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'rgba(74,222,128,0.1)',
                    color: '#4ade80',
                    border: '1px solid rgba(74,222,128,0.3)'
                  }}>
                    installed
                  </span>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Installed plugins */}
      <div style={sectionLabel}>Installed</div>
      {installed.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No plugins installed yet. Search above to find plugins.
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
