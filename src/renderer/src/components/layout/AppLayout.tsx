import { useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { UsePanelLayoutResult } from '../../hooks/usePanelLayout'

interface AppLayoutProps {
  layout: UsePanelLayoutResult
  menuBar: ReactNode
  activityBar: ReactNode
  sidebar: ReactNode
  editor: ReactNode
  aiPanel: ReactNode
  bottomPanel: ReactNode
}

export function AppLayout({
  layout,
  menuBar,
  activityBar,
  sidebar,
  editor,
  aiPanel,
  bottomPanel
}: AppLayoutProps) {
  const {
    sidebarVisible,
    aiPanelVisible,
    bottomPanelVisible,
    sidebarWidth,
    aiPanelWidth,
    bottomPanelHeight,
    setSidebarWidth,
    setAiPanelWidth,
    setBottomPanelHeight
  } = layout

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
      bottomPanelHeight
    e.preventDefault()
  }, [sidebarWidth, aiPanelWidth, bottomPanelHeight])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (dragging.current === 'sidebar') {
      setSidebarWidth(Math.max(140, Math.min(520, startVal.current + dx)))
    } else if (dragging.current === 'ai') {
      setAiPanelWidth(Math.max(200, Math.min(640, startVal.current - dx)))
    } else if (dragging.current === 'bottom') {
      setBottomPanelHeight(Math.max(80, Math.min(640, startVal.current - dy)))
    }
  }, [setSidebarWidth, setAiPanelWidth, setBottomPanelHeight])

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
        {/* Activity bar — always visible */}
        {activityBar}

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

          {bottomPanelVisible && (
            <>
              <div
                onMouseDown={e => onMouseDown('bottom', e)}
                style={handleStyle('row-resize')}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              />
              <div style={{
                height: bottomPanelHeight,
                minHeight: bottomPanelHeight,
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
        {aiPanelVisible && (
          <div
            onMouseDown={e => onMouseDown('ai', e)}
            style={handleStyle('col-resize')}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          />
        )}

        {/* AI Panel */}
        {aiPanelVisible && (
          <div style={{
            width: aiPanelWidth,
            minWidth: aiPanelWidth,
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {aiPanel}
          </div>
        )}
      </div>
    </div>
  )
}
