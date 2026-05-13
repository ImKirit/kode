import { Files, Terminal, MessageSquare, Package, Clock } from 'lucide-react'

interface ActivityBarProps {
  sidebarVisible: boolean
  sidebarView: 'files' | 'threads'
  aiPanelVisible: boolean
  bottomPanelVisible: boolean
  pluginBrowserOpen?: boolean
  onToggleSidebar(): void
  onShowThreads(): void
  onToggleAiPanel(): void
  onToggleBottomPanel(): void
  onTogglePluginBrowser?(): void
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
  sidebarView,
  aiPanelVisible,
  bottomPanelVisible,
  pluginBrowserOpen = false,
  onToggleSidebar,
  onShowThreads,
  onToggleAiPanel,
  onToggleBottomPanel,
  onTogglePluginBrowser
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
        gap: 2
      }}
    >
      <ActivityBarButton
        icon={<Files size={17} />}
        active={sidebarVisible && sidebarView === 'files'}
        label="Toggle Explorer"
        onClick={onToggleSidebar}
      />
      <ActivityBarButton
        icon={<Clock size={17} />}
        active={sidebarVisible && sidebarView === 'threads'}
        label="Toggle Threads"
        onClick={onShowThreads}
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
          icon={<Package size={17} />}
          active={pluginBrowserOpen}
          label="Plugin Marketplace"
          onClick={onTogglePluginBrowser}
        />
      )}
    </div>
  )
}
