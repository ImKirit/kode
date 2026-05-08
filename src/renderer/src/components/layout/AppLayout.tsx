import { useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'

interface AppLayoutProps {
  menuBar: ReactNode
  sidebar: ReactNode
  editor: ReactNode
  aiPanel: ReactNode
  bottomPanel: ReactNode
}

export function AppLayout({ menuBar, sidebar, editor, aiPanel, bottomPanel }: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [aiPanelWidth, setAiPanelWidth] = useState(360)
  const [bottomHeight, setBottomHeight] = useState(220)
  const [sidebarVisible] = useState(true)
  const [bottomVisible] = useState(true)

  const dragging = useRef<'sidebar' | 'ai' | 'bottom' | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const startVal = useRef(0)

  const onMouseDown = useCallback((
    handle: 'sidebar' | 'ai' | 'bottom',
    e: React.MouseEvent
  ) => {
    dragging.current = handle
    startX.current = e.clientX
    startY.current = e.clientY
    startVal.current =
      handle === 'sidebar' ? sidebarWidth :
      handle === 'ai' ? aiPanelWidth :
      bottomHeight
    e.preventDefault()
  }, [sidebarWidth, aiPanelWidth, bottomHeight])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (dragging.current === 'sidebar') {
      setSidebarWidth(Math.max(140, Math.min(520, startVal.current + dx)))
    } else if (dragging.current === 'ai') {
      setAiPanelWidth(Math.max(200, Math.min(640, startVal.current - dx)))
    } else if (dragging.current === 'bottom') {
      setBottomHeight(Math.max(80, Math.min(640, startVal.current - dy)))
    }
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = null
  }, [])

  const handleStyle = (cursor: 'col-resize' | 'row-resize') => ({
    flexShrink: 0,
    background: 'transparent',
    cursor,
    zIndex: 10,
    ...(cursor === 'col-resize' ? { width: 4 } : { height: 4 })
  } as React.CSSProperties)

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {menuBar}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar */}
        {sidebarVisible && (
          <>
            <div style={{
              width: sidebarWidth,
              minWidth: sidebarWidth,
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0
            }}>
              {sidebar}
            </div>
            <div
              onMouseDown={e => onMouseDown('sidebar', e)}
              style={handleStyle('col-resize')}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            />
          </>
        )}

        {/* Center column: editor + bottom panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {editor}
          </div>

          {bottomVisible && (
            <>
              <div
                onMouseDown={e => onMouseDown('bottom', e)}
                style={handleStyle('row-resize')}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              />
              <div style={{
                height: bottomHeight,
                minHeight: bottomHeight,
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border)',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {bottomPanel}
              </div>
            </>
          )}
        </div>

        {/* AI panel resize handle */}
        <div
          onMouseDown={e => onMouseDown('ai', e)}
          style={handleStyle('col-resize')}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        />

        {/* AI Panel */}
        <div style={{
          width: aiPanelWidth,
          minWidth: aiPanelWidth,
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {aiPanel}
        </div>
      </div>
    </div>
  )
}
