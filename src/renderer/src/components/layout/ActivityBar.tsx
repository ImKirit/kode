import { Files, Terminal, MessageSquare } from 'lucide-react'

interface ActivityBarProps {
  sidebarVisible: boolean
  aiPanelVisible: boolean
  bottomPanelVisible: boolean
  onToggleSidebar(): void
  onToggleAiPanel(): void
  onToggleBottomPanel(): void
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
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        padding: 0,
        boxSizing: 'border-box' as const
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
  onToggleSidebar,
  onToggleAiPanel,
  onToggleBottomPanel
}: ActivityBarProps) {
  return (
    <div
      data-testid="activity-bar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 40,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
        alignItems: 'center',
        paddingTop: 4
      }}
    >
      <ActivityBarButton
        icon={<Files size={18} />}
        active={sidebarVisible}
        label="Toggle Explorer"
        onClick={onToggleSidebar}
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
    </div>
  )
}
