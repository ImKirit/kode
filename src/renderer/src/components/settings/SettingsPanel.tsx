import { useState } from 'react'
import { X, Download, Upload } from 'lucide-react'
import { AppearanceSettings } from './AppearanceSettings'
import { EditorSettings } from './EditorSettings'
import { McpSettings } from './McpSettings'
import { KeybindingsSettings } from './KeybindingsSettings'
import { GitHubSettings } from './GitHubSettings'
import { DeploySettings } from './DeploySettings'
import type { ThemeName } from '../../styles/themes'
import type { McpServerConfig } from '../../types/electron'
import type { KeybindingAction } from '../../styles/keybindings'
import type { EditorConfig } from '../../hooks/useSettings'

interface SettingsPanelProps {
  open: boolean
  onClose(): void
  theme: ThemeName
  customPrimary: string
  customAccent: string
  onSetTheme(name: ThemeName): void
  onSetCustomColors(primary: string, accent: string): void
  mcpServers: McpServerConfig[]
  mcpPermission: 'ask' | 'full'
  onAddMcpServer(config: Omit<McpServerConfig, 'id'>): void
  onRemoveMcpServer(id: string): void
  onSetMcpPermission(value: 'ask' | 'full'): void
  keybindings?: Record<string, string>
  onSetKeybinding?(action: KeybindingAction, key: string): void
  editorConfig: EditorConfig
  onSetEditorConfig(config: EditorConfig): void
  currentFolder?: string | null
}

export function SettingsPanel({
  open, onClose, theme, customPrimary, customAccent, onSetTheme, onSetCustomColors,
  mcpServers, mcpPermission, onAddMcpServer, onRemoveMcpServer, onSetMcpPermission,
  keybindings, onSetKeybinding, editorConfig, onSetEditorConfig, currentFolder
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'mcp' | 'keybindings' | 'github' | 'deploy'>('appearance')

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 900,
          backdropFilter: 'blur(2px)'
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          maxHeight: '82vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          zIndex: 901,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Settings
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              data-flat
              aria-label="Export settings"
              title="Export settings to JSON"
              onClick={async () => {
                await window.kode.settings.export()
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                background: 'transparent', color: 'var(--text-muted)'
              }}
            >
              <Download size={14} />
            </button>
            <button
              data-flat
              aria-label="Import settings"
              title="Import settings from JSON"
              onClick={async () => {
                const result = await window.kode.settings.import()
                if (result.ok && result.settings) {
                  const current = await window.kode.settings.get()
                  await window.kode.settings.set({ ...current, ...result.settings })
                  window.location.reload()
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                background: 'transparent', color: 'var(--text-muted)'
              }}
            >
              <Upload size={14} />
            </button>
            <button
              data-flat
              aria-label="Close settings"
              onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              color: 'var(--text-muted)'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sidebar)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
            </button>
          </div>
        </div>

        {/* Body — sidebar + content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Sidebar */}
          <div style={{
            width: 160,
            borderRight: '1px solid var(--border)',
            padding: '12px 8px',
            flexShrink: 0,
            background: 'var(--bg-sidebar)'
          }}>
            {(['appearance', 'editor', 'mcp', 'keybindings', 'github', 'deploy'] as const).map(tab => (
              <button
                key={tab}
                data-flat
                aria-pressed={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: activeTab === tab ? 'var(--kode-btn)' : 'transparent',
                  color: activeTab === tab ? 'var(--kode-btn-fg)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab === 'appearance' ? 'Appearance'
                  : tab === 'editor' ? 'Editor'
                  : tab === 'mcp' ? 'MCP'
                  : tab === 'keybindings' ? 'Keybindings'
                  : tab === 'github' ? 'GitHub'
                  : 'Deploy'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {activeTab === 'appearance' && (
              <AppearanceSettings
                theme={theme}
                customPrimary={customPrimary}
                customAccent={customAccent}
                onSetTheme={onSetTheme}
                onSetCustomColors={onSetCustomColors}
              />
            )}
            {activeTab === 'editor' && (
              <EditorSettings config={editorConfig} onChange={onSetEditorConfig} />
            )}
            {activeTab === 'mcp' && (
              <McpSettings
                servers={mcpServers}
                permission={mcpPermission}
                onAddServer={onAddMcpServer}
                onRemoveServer={onRemoveMcpServer}
                onSetPermission={onSetMcpPermission}
              />
            )}
            {activeTab === 'keybindings' && (
              <KeybindingsSettings
                keybindings={(keybindings ?? {}) as Partial<Record<KeybindingAction, string>>}
                onSetKeybinding={onSetKeybinding ?? (() => {})}
              />
            )}
            {activeTab === 'github' && (
              <GitHubSettings currentFolder={currentFolder} />
            )}
            {activeTab === 'deploy' && (
              <DeploySettings />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
