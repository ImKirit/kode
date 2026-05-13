import { useState, useRef, useEffect } from 'react'

interface MenuAction {
  label: string
  shortcut?: string
  separator?: boolean
  action?(): void
}

interface MenuDef {
  label: string
  items: MenuAction[]
}

interface MenuBarProps {
  projectName: string
  onOpenFolder(): void
  onSave?(): void
  onOpenSettings?(): void
}

export function MenuBar({ projectName, onOpenFolder, onSave, onOpenSettings }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: () => { setOpenMenu(null); onOpenFolder() } },
        { label: '', separator: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => { setOpenMenu(null); onSave?.() } },
        { label: 'Save All', shortcut: 'Ctrl+Shift+S' },
        { label: '', separator: true },
        { label: 'Settings...', shortcut: 'Ctrl+,', action: () => { setOpenMenu(null); onOpenSettings?.() } }
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { label: '', separator: true },
        { label: 'Find', shortcut: 'Ctrl+F' },
        { label: 'Replace', shortcut: 'Ctrl+H' }
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B' },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J' }
      ]
    },
    {
      label: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+`' }
      ]
    },
    {
      label: 'AI',
      items: [
        { label: 'New Agent Session' },
        { label: '', separator: true },
        { label: 'Manage Subscriptions' },
        { label: 'Scheduled Prompts' }
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'About Kode' }
      ]
    }
  ]

  useEffect(() => {
    if (!openMenu) return
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  const isMac = window.kode?.platform === 'darwin'

  return (
    <div
      ref={barRef}
      className="drag-region"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 32,
        background: 'var(--kode-titlebar)',
        borderBottom: '1px solid var(--border)',
        paddingLeft: isMac ? 80 : 6,
        paddingRight: 12,
        flexShrink: 0,
        fontSize: 13,
        position: 'relative',
        zIndex: 100
      }}
    >
      {/* Menu items */}
      {menus.map(menu => (
        <div key={menu.label} className="no-drag" style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            style={{
              padding: '0 9px',
              height: 32,
              background: openMenu === menu.label ? 'rgba(0,0,0,0.08)' : 'none',
              color: 'var(--text-secondary)',
              fontSize: 12,
              borderRadius: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.06)'
              if (openMenu && openMenu !== menu.label) setOpenMenu(menu.label)
            }}
            onMouseLeave={e => {
              if (openMenu !== menu.label) e.currentTarget.style.background = 'none'
            }}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              minWidth: 220,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)',
              zIndex: 1000,
              padding: '4px 0'
            }}>
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} style={{
                    height: 1,
                    background: 'var(--border)',
                    margin: '3px 0'
                  }} />
                ) : (
                  <div
                    key={item.label}
                    onClick={() => { item.action?.(); setOpenMenu(null) }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 14px',
                      color: item.action ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: 12,
                      cursor: item.action ? 'pointer' : 'default'
                    }}
                    onMouseEnter={e => {
                      if (item.action) e.currentTarget.style.background = 'var(--kode-selection)'
                    }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 24 }}>
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Centered KODE label (absolute) */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none'
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase'
        }}>
          KODE
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {projectName && (
        <span
          className="no-drag"
          style={{ color: 'var(--text-muted)', fontSize: 11 }}
        >
          {projectName}
        </span>
      )}
    </div>
  )
}
