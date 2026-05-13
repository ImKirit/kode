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
        background: active ? 'var(--accent)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: active ? '#ffffff' : 'var(--text-muted)',
        borderRadius: 'var(--radius-md)',
        padding: 0,
        boxSizing: 'border-box' as const,
        transition: 'background var(--transition-fast), color var(--transition-fast)'
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
        width: 48,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
        alignItems: 'center',
        paddingTop: 4
      }}
    >
      <ActivityBarButton
        icon={<Files size={18} />}
        active={sidebarVisible && sidebarView === 'files'}
        label="Toggle Explorer"
        onClick={onToggleSidebar}
      />
      <ActivityBarButton
        icon={<Clock size={18} />}
        active={sidebarVisible && sidebarView === 'threads'}
        label="Toggle Threads"
        onClick={onShowThreads}
      />
      <ActivityBarButton
        icon={<MessageSquare size={18} />}
        active={aiPanelVisible}
        label="Toggle AI Panel"
        onClick={onToggleAiPanel}
      />
      <ActivityBarButton
        icon={<Terminal size={18} />}
        active={bottomPanelVisible}
        label="Toggle Terminal"
        onClick={onToggleBottomPanel}
      />
      {onTogglePluginBrowser && (
        <ActivityBarButton
          icon={<Package size={18} />}
          active={pluginBrowserOpen}
          label="Plugin Marketplace"
          onClick={onTogglePluginBrowser}
        />
      )}
    </div>
  )
}
