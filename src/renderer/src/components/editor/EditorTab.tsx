import { useState } from 'react'
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
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        paddingLeft: 12,
        paddingRight: 6,
        height: 35,
        background: active || hovered ? 'var(--bg-tab-active)' : 'var(--bg-tab-inactive)',
        borderRight: '1px solid var(--border)',
        borderBottom: active ? '2px solid var(--kode-btn)' : '2px solid transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        fontSize: 12,
        flexShrink: 0,
        transition: 'background var(--transition-fast)'
      }}
    >
      {/* Dirty dot — show when dirty and not hovering (hover shows close button instead) */}
      {dirty && !hovered && (
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

      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
        {name}
      </span>

      {/* Close button — fades in on hover/active/dirty */}
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
          flexShrink: 0,
          opacity: (active || hovered || dirty) ? 1 : 0,
          pointerEvents: (active || hovered || dirty) ? 'auto' : 'none',
          transition: 'opacity var(--transition-fast), background var(--transition-fast)'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.1)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        <X size={11} />
      </button>
    </div>
  )
}
