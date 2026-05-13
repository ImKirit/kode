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
        borderBottom: active ? '2px solid var(--kode-btn)' : '2px solid transparent',
        borderTop: active ? '1px solid transparent' : 'none',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        fontSize: 12,
        flexShrink: 0,
        transition: 'background var(--transition-fast)'
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'var(--bg-tab-active)'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'var(--bg-tab-inactive)'
      }}
    >
      {dirty && (
        <span
          data-testid="dirty-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            flexShrink: 0
          }}
        />
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{name}</span>
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
          height: 18,
          opacity: 0.6
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.background = 'rgba(0,0,0,0.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.6'
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'none'
        }}
      >
        <X size={11} />
      </button>
    </div>
  )
}
