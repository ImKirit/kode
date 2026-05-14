import { useEffect, useRef, useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { GoldenLayout } from 'golden-layout'
import type { LayoutConfig, ComponentContainer } from 'golden-layout'
import 'golden-layout/dist/css/goldenlayout-base.css'

const STORAGE_KEY = 'kode-gl-layout'

const DEFAULT_CONFIG: LayoutConfig = {
  root: {
    type: 'row',
    content: [
      {
        type: 'component',
        componentType: 'explorer',
        title: 'Explorer',
        width: 18,
        isClosable: false
      },
      {
        type: 'column',
        content: [
          {
            type: 'component',
            componentType: 'editor',
            title: 'Editor',
            height: 70,
            isClosable: false
          },
          {
            type: 'component',
            componentType: 'bottomPanel',
            title: 'Terminal',
            height: 30,
            isClosable: false
          }
        ],
        width: 58
      },
      {
        type: 'component',
        componentType: 'ai',
        title: 'AI Chat',
        width: 24,
        isClosable: false
      }
    ]
  }
}

type RenderFn = () => ReactNode

interface GoldenLayoutWrapperProps {
  menuBar: ReactNode
  activityBar: ReactNode
  statusBar?: ReactNode
  renderExplorer: RenderFn
  renderEditor: RenderFn
  renderAi: RenderFn
  renderBottomPanel: RenderFn
}

function loadSavedConfig(): LayoutConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LayoutConfig
  } catch {
    return null
  }
}

export function GoldenLayoutWrapper({
  menuBar,
  activityBar,
  statusBar,
  renderExplorer,
  renderEditor,
  renderAi,
  renderBottomPanel
}: GoldenLayoutWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<GoldenLayout | null>(null)
  const rootsRef = useRef<Map<string, { root: Root; container: ComponentContainer }>>(new Map())
  const [glReady, setGlReady] = useState(false)

  // Keep render functions fresh in refs — GL constructors capture these at registration time
  const renderFns = useRef({ renderExplorer, renderEditor, renderAi, renderBottomPanel })
  useEffect(() => {
    renderFns.current = { renderExplorer, renderEditor, renderAi, renderBottomPanel }
  })

  // Re-render all GL-mounted React roots when parent props change
  useEffect(() => {
    rootsRef.current.forEach(({ root, container }, type) => {
      root.render(renderFns.current[`render${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof renderFns.current]() as React.ReactElement)
    })
  })

  const registerComponent = useCallback((gl: GoldenLayout, type: string, render: () => ReactNode) => {
    gl.registerComponentConstructor(type, (container: ComponentContainer) => {
      const root = createRoot(container.element)
      root.render(render() as React.ReactElement)
      rootsRef.current.set(type, { root, container })

      container.on('destroy', () => {
        root.unmount()
        rootsRef.current.delete(type)
      })
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const gl = new GoldenLayout(containerRef.current)
    glRef.current = gl

    registerComponent(gl, 'explorer', () => renderFns.current.renderExplorer())
    registerComponent(gl, 'editor', () => renderFns.current.renderEditor())
    registerComponent(gl, 'ai', () => renderFns.current.renderAi())
    registerComponent(gl, 'bottomPanel', () => renderFns.current.renderBottomPanel())

    const config = loadSavedConfig() ?? DEFAULT_CONFIG
    try {
      gl.loadLayout(config)
    } catch {
      gl.loadLayout(DEFAULT_CONFIG)
    }

    gl.resizeWithContainerAutomatically = true

    // Persist layout on every state change
    gl.addEventListener('stateChanged', () => {
      try {
        const saved = JSON.stringify(gl.saveLayout())
        localStorage.setItem(STORAGE_KEY, saved)
      } catch {
        // ignore serialization errors
      }
    })

    setGlReady(true)

    return () => {
      rootsRef.current.forEach(({ root }) => root.unmount())
      rootsRef.current.clear()
      try { gl.destroy() } catch { /* ignore */ }
      glRef.current = null
    }
  }, [registerComponent])

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
      className="kode-gl-root"
    >
      {menuBar}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {activityBar}

        {/* GoldenLayout container */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
            opacity: glReady ? 1 : 0
          }}
        />
      </div>

      {statusBar !== undefined && (
        <div style={{
          height: 22,
          minHeight: 22,
          background: 'var(--kode-statusbar)',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {statusBar}
        </div>
      )}
    </div>
  )
}
