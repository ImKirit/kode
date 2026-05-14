import { Files, Terminal, MessageSquare, Settings, Upload, Globe, LayoutGrid } from 'lucide-react'

interface ActivityBarProps {
  sidebarVisible: boolean
  sidebarView: 'files'
  aiPanelVisible: boolean
  bottomPanelVisible: boolean
  localHostActive?: boolean
  onToggleSidebar(): void
  onToggleAiPanel(): void
  onToggleBottomPanel(): void
  onTogglePluginBrowser?(): void
  onOpenSettings?(): void
  onOpenDeploy?(): void
  onToggleLocalHost?(): void
}

interface BtnProps {
  icon: React.ReactNode
  active: boolean
  label: string
  onClick(): void
}

function ActivityBarButton({ icon, active, label, onClick }: BtnProps) {
  return (
    <button
      data-flat
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        background: active ? 'var(--kode-btn)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--kode-btn-fg)' : 'var(--text-muted)',
        borderRadius: 'var(--radius-md)',
        padding: 0,
        transition: 'background var(--transition-fast), color var(--transition-fast)'
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(0,0,0,0.07)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
        }
      }}
    >
      {icon}
    </button>
  )
}

export function ActivityBar({
  sidebarVisible,
  aiPanelVisible,
  bottomPanelVisible,
  localHostActive = false,
  onToggleSidebar,
  onToggleAiPanel,
  onToggleBottomPanel,
  onTogglePluginBrowser,
  onOpenSettings,
  onOpenDeploy,
  onToggleLocalHost
}: ActivityBarProps) {
  return (
    <div
      data-testid="activity-bar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 44,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
        alignItems: 'center',
        paddingTop: 6,
        paddingBottom: 6,
        gap: 2
      }}
    >
      <ActivityBarButton
        icon={<Files size={17} />}
        active={sidebarVisible && true}
        label="Toggle Explorer"
        onClick={onToggleSidebar}
      />
      <ActivityBarButton
        icon={<MessageSquare size={17} />}
        active={aiPanelVisible}
        label="Toggle AI Panel"
        onClick={onToggleAiPanel}
      />
      <ActivityBarButton
        icon={<Terminal size={17} />}
        active={bottomPanelVisible}
        label="Toggle Terminal"
        onClick={onToggleBottomPanel}
      />
      {onTogglePluginBrowser && (
        <ActivityBarButton
          icon={<LayoutGrid size={17} />}
          active={false}
          label="Plugin Marketplace"
          onClick={onTogglePluginBrowser}
        />
      )}
      {onToggleLocalHost && (
        <ActivityBarButton
          icon={<Globe size={17} />}
          active={localHostActive}
          label="Local Host"
          onClick={onToggleLocalHost}
        />
      )}

      {/* Bottom pinned actions */}
      <div style={{ flex: 1 }} />
      {onOpenDeploy && (
        <ActivityBarButton
          icon={<Upload size={17} />}
          active={false}
          label="Deploy"
          onClick={onOpenDeploy}
        />
      )}
      {onOpenSettings && (
        <ActivityBarButton
          icon={<Settings size={17} />}
          active={false}
          label="Settings"
          onClick={onOpenSettings}
        />
      )}
    </div>
  )
}
