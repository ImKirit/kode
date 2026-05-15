import { useState, useEffect, useCallback, useRef } from 'react'
import { useSettings } from '../../hooks/useSettings'
import type { EditorConfig } from '../../hooks/useSettings'

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

interface BuiltinPluginDef {
  id: string
  name: string
  category: string
  isKode: boolean
  description: string
  get(cfg: EditorConfig): boolean
  set(cfg: EditorConfig, v: boolean): EditorConfig
}

interface RecommendedPluginDef {
  id: string
  name: string
  publisher: string
  category: string
  description: string
  marketplaceId: string
}

const BUILTIN_PLUGINS: BuiltinPluginDef[] = [
  {
    id: 'formatOnSave',
    name: 'Format on Save',
    category: 'Productivity',
    isKode: true,
    description: 'Formats the entire document with the built-in formatter every time you press Ctrl+S.',
    get: cfg => cfg.formatOnSave ?? false,
    set: (cfg, v) => ({ ...cfg, formatOnSave: v })
  },
  {
    id: 'autoSave',
    name: 'Auto Save',
    category: 'Productivity',
    isKode: true,
    description: 'Saves files automatically 1 second after your last keystroke. No need to Ctrl+S.',
    get: cfg => cfg.autoSave ?? false,
    set: (cfg, v) => ({ ...cfg, autoSave: v })
  },
  {
    id: 'minimap',
    name: 'Minimap',
    category: 'Editor',
    isKode: false,
    description: 'Shows a bird\'s-eye code overview on the right edge of the editor.',
    get: cfg => cfg.minimap,
    set: (cfg, v) => ({ ...cfg, minimap: v })
  },
  {
    id: 'wordWrap',
    name: 'Word Wrap',
    category: 'Editor',
    isKode: false,
    description: 'Wraps long lines to fit the editor width instead of scrolling horizontally.',
    get: cfg => cfg.wordWrap === 'on',
    set: (cfg, v) => ({ ...cfg, wordWrap: v ? 'on' as const : 'off' as const })
  },
  {
    id: 'bracketPairColorization',
    name: 'Bracket Pair Colorization',
    category: 'Editor',
    isKode: false,
    description: 'Colors matching bracket pairs with distinct colors to simplify reading nested code.',
    get: cfg => cfg.bracketPairColorization ?? true,
    set: (cfg, v) => ({ ...cfg, bracketPairColorization: v })
  },
  {
    id: 'smoothScrolling',
    name: 'Smooth Scrolling',
    category: 'Editor',
    isKode: false,
    description: 'Adds animation to editor scrolling for a smoother visual experience.',
    get: cfg => cfg.smoothScrolling ?? true,
    set: (cfg, v) => ({ ...cfg, smoothScrolling: v })
  }
]

const RECOMMENDED_PLUGINS: RecommendedPluginDef[] = [
  {
    id: 'prettier',
    name: 'Prettier – Code formatter',
    publisher: 'esbenp',
    category: 'Formatter',
    description: 'Opinionated formatter for JS, TS, CSS, HTML, JSON, and Markdown.',
    marketplaceId: 'esbenp.prettier-vscode'
  },
  {
    id: 'eslint',
    name: 'ESLint',
    publisher: 'dbaeumer',
    category: 'Linter',
    description: 'Integrates ESLint linting feedback directly into the editor gutter.',
    marketplaceId: 'dbaeumer.vscode-eslint'
  },
  {
    id: 'gitlens',
    name: 'GitLens',
    publisher: 'eamodio',
    category: 'Git',
    description: 'Inline Git blame, rich history navigation, and repository exploration.',
    marketplaceId: 'eamodio.gitlens'
  },
  {
    id: 'error-lens',
    name: 'Error Lens',
    publisher: 'usernamehw',
    category: 'Linter',
    description: 'Shows errors and warnings inline next to the source line that caused them.',
    marketplaceId: 'usernamehw.errorlens'
  },
  {
    id: 'auto-rename-tag',
    name: 'Auto Rename Tag',
    publisher: 'formulahendry',
    category: 'Productivity',
    description: 'Automatically renames the matching HTML/XML tag when you edit one side.',
    marketplaceId: 'formulahendry.auto-rename-tag'
  }
]

const categoryColor: Record<string, string> = {
  Server:       '#4ade80',
  Formatter:    '#6366f1',
  Linter:       '#f59e0b',
  Git:          '#f87171',
  Productivity: '#22d3ee',
  Snippets:     '#a78bfa',
  Editor:       '#818cf8',
  AI:           '#a78bfa'
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle(): void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      style={{
        width: 30, height: 17, borderRadius: 9, cursor: 'pointer', flexShrink: 0,
        background: enabled ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.15s'
      }}
    >
      <div style={{
        position: 'absolute', top: 2.5,
        left: enabled ? 14 : 2.5,
        width: 12, height: 12, borderRadius: '50%', background: 'white',
        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
      }} />
    </div>
  )
}

export function PluginBrowser({ rootPath: _rootPath }: { rootPath?: string | null }) {
  const { settings, setEditorConfig } = useSettings()
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

  useEffect(() => { refreshInstalled() }, [refreshInstalled])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) { setSearchResults([]); setSearching(false); return }
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

  const handleToggleBuiltin = useCallback((plugin: BuiltinPluginDef) => {
    if (!settings) return
    const cfg = settings.editor ?? { fontSize: 13, tabSize: 2, wordWrap: 'off' as const, minimap: true, lineNumbers: 'on' as const }
    const current = plugin.get(cfg)
    setEditorConfig(plugin.set(cfg, !current))
  }, [settings, setEditorConfig])

  const installedIds = new Set(installed.map(p => p.id))
  const isSearching = !!searchQuery.trim()
  const editorCfg = settings?.editor

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    marginBottom: 8, marginTop: 20
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
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
        Built-in toggles and npm packages tagged <code style={{ fontFamily: 'monospace', fontSize: 11 }}>kode-plugin</code>.
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
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>installed</span>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Built-in toggleable plugins */}
      {!isSearching && (
        <>
          <div style={sectionLabel}>Built-in</div>
          {BUILTIN_PLUGINS.map(plugin => {
            const catColor = categoryColor[plugin.category] ?? 'var(--text-muted)'
            const enabled = editorCfg ? plugin.get(editorCfg) : false
            return (
              <div key={plugin.id} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{plugin.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 5px', borderRadius: 4,
                      background: catColor + '22', color: catColor, border: `1px solid ${catColor}55`
                    }}>{plugin.category}</span>
                    {plugin.isKode && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 5px', borderRadius: 4,
                        background: 'var(--kode-selection)', color: 'var(--accent)', border: '1px solid var(--accent)44'
                      }}>Kode</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                    {plugin.description}
                  </div>
                </div>
                <Toggle enabled={enabled} onToggle={() => handleToggleBuiltin(plugin)} />
              </div>
            )
          })}
        </>
      )}

      {/* Recommended (VS Code marketplace extensions) */}
      {!isSearching && (
        <>
          <div style={{ ...sectionLabel, marginTop: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
            Recommended
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 4,
              background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
              textTransform: 'none'
            }}>VS Code Marketplace</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Popular extensions from the VS Code ecosystem — native Kode integration coming soon.
          </div>
          {RECOMMENDED_PLUGINS.map(plugin => {
            const catColor = categoryColor[plugin.category] ?? 'var(--text-muted)'
            return (
              <div key={plugin.id} style={{ ...row, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{plugin.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', padding: '1px 5px', borderRadius: 4,
                      background: catColor + '22', color: catColor, border: `1px solid ${catColor}55`
                    }}>{plugin.category}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{plugin.publisher}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                    {plugin.description}
                  </div>
                </div>
                <button
                  onClick={() => window.kode.shell.openExternal(`https://marketplace.visualstudio.com/items?itemName=${plugin.marketplaceId}`)}
                  style={{ ...btnBase, background: 'none', color: 'var(--accent)', borderColor: 'var(--accent)55', flexShrink: 0 }}
                >
                  View
                </button>
              </div>
            )
          })}
        </>
      )}

      {/* Installed npm plugins */}
      {!isSearching && (
        <>
          <div style={{ ...sectionLabel, marginTop: 28 }}>Installed</div>
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
