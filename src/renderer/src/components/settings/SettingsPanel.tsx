import { useState } from 'react'
import { X } from 'lucide-react'
import { AppearanceSettings } from './AppearanceSettings'
import { McpSettings } from './McpSettings'
import type { ThemeName } from '../../styles/themes'
import type { McpServerConfig } from '../../types/electron'

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
}

export function SettingsPanel({
  open, onClose, theme, customPrimary, customAccent, onSetTheme, onSetCustomColors,
  mcpServers, mcpPermission, onAddMcpServer, onRemoveMcpServer, onSetMcpPermission
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'mcp'>('appearance')

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
          width: 520,
          maxHeight: '80vh',
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
            {(['appearance', 'mcp'] as const).map(tab => (
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
                  background: activeTab === tab ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab === 'appearance' ? 'Appearance' : 'MCP'}
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
            {activeTab === 'mcp' && (
              <McpSettings
                servers={mcpServers}
                permission={mcpPermission}
                onAddServer={onAddMcpServer}
                onRemoveServer={onRemoveMcpServer}
                onSetPermission={onSetMcpPermission}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
