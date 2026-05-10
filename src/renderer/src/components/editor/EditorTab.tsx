import { X } from 'lucide-react'

interface EditorTabProps {
  path: string
  name: string
  active: boolean
  dirty: boolean
  onActivate(): void
  onClose(): void
}

export function EditorTab({ name, active, dirty, onActivate, onClose }: EditorTabProps) {
  return (
    <div
      onClick={onActivate}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        height: 35,
        background: active ? 'var(--bg-tab-active)' : 'var(--bg-tab-inactive)',
        borderRight: '1px solid var(--border)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        fontSize: 13,
        flexShrink: 0,
        transition: 'background var(--transition-fast)'
      }}
    >
      {dirty && (
        <span
          data-testid="dirty-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--text-secondary)',
            flexShrink: 0
          }}
        />
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      <button
        data-flat
        aria-label="close tab"
        onClick={e => { e.stopPropagation(); onClose() }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          color: 'var(--text-muted)',
          padding: 2,
          borderRadius: 3,
          marginLeft: 2,
          width: 18,
          height: 18
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <X size={12} />
      </button>
    </div>
  )
}
