import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { GoldenLayout } from 'golden-layout'
import type { LayoutConfig, ComponentContainer, ContentItem } from 'golden-layout'
import 'golden-layout/dist/css/goldenlayout-base.css'

const STORAGE_KEY = 'kode-gl-layout'
const STORAGE_VER_KEY = 'kode-gl-layout-ver'
const LAYOUT_VERSION = '1'

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

export interface GoldenLayoutHandle {
  /** Toggles a panel. Returns the new visibility state (true = now visible). */
  togglePanel(type: 'explorer' | 'ai' | 'bottomPanel'): boolean
  isPanelOpen(type: 'explorer' | 'ai' | 'bottomPanel'): boolean
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
    if (localStorage.getItem(STORAGE_VER_KEY) !== LAYOUT_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(STORAGE_VER_KEY, LAYOUT_VERSION)
      return null
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LayoutConfig
  } catch {
    return null
  }
}

function findByComponentType(item: ContentItem, type: string): ContentItem | null {
  if ((item as unknown as { componentType?: string }).componentType === type) return item
  for (const child of item.contentItems) {
    const found = findByComponentType(child, type)
    if (found) return found
  }
  return null
}

export const GoldenLayoutWrapper = forwardRef<GoldenLayoutHandle, GoldenLayoutWrapperProps>(
  function GoldenLayoutWrapper(
    { menuBar, activityBar, statusBar, renderExplorer, renderEditor, renderAi, renderBottomPanel },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const glRef = useRef<GoldenLayout | null>(null)
    const rootsRef = useRef<Map<string, { root: Root; container: ComponentContainer }>>(new Map())
    const hiddenPanels = useRef<Set<string>>(new Set())

    const renderFns = useRef({ renderExplorer, renderEditor, renderAi, renderBottomPanel })
    useEffect(() => {
      renderFns.current = { renderExplorer, renderEditor, renderAi, renderBottomPanel }
    })

    // Re-render all GL-mounted React roots when parent props change
    useEffect(() => {
      rootsRef.current.forEach(({ root }, type) => {
        const key = `render${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof renderFns.current
        root.render(renderFns.current[key]() as React.ReactElement)
      })
    })

    useImperativeHandle(ref, () => ({
      togglePanel(type) {
        const gl = glRef.current
        if (!gl || !gl.rootItem) return true

        if (hiddenPanels.current.has(type)) {
          // Re-add the panel
          hiddenPanels.current.delete(type)
          const rootRow = gl.rootItem

          if (type === 'explorer') {
            rootRow.addChild(
              { type: 'component', componentType: 'explorer', title: 'Explorer', isClosable: false } as never,
              0
            )
          } else if (type === 'ai') {
            rootRow.addChild(
              { type: 'component', componentType: 'ai', title: 'AI Chat', isClosable: false } as never
            )
          } else if (type === 'bottomPanel') {
            // Find the column that contains the editor
            const editorItem = findByComponentType(rootRow, 'editor')
            // editor → Stack → column RowOrColumn
            const col = editorItem?.parent?.parent ?? null
            const target = col ?? rootRow
            target.addChild(
              { type: 'component', componentType: 'bottomPanel', title: 'Terminal', isClosable: false } as never
            )
          }
          return true
        } else {
          // Remove the panel
          const item = findByComponentType(gl.rootItem, type)
          if (item) {
            hiddenPanels.current.add(type)
            item.remove()
          }
          return false
        }
      },
      isPanelOpen(type) {
        return !hiddenPanels.current.has(type)
      }
    }), [])

    const registerComponent = useCallback((gl: GoldenLayout, type: string, render: () => ReactNode) => {
      gl.registerComponentConstructor(type, (container: ComponentContainer) => {
        const el = container.element
        el.style.overflow = 'hidden'
        el.style.height = '100%'
        const root = createRoot(el)
        root.render(render() as React.ReactElement)
        rootsRef.current.set(type, { root, container })

        container.on('destroy', () => {
          root.unmount()
          rootsRef.current.delete(type)
        })
      })
    }, [])

    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      el.innerHTML = ''
      hiddenPanels.current.clear()

      const gl = new GoldenLayout(el)
      glRef.current = gl

      registerComponent(gl, 'explorer', () => renderFns.current.renderExplorer())
      registerComponent(gl, 'editor', () => renderFns.current.renderEditor())
      registerComponent(gl, 'ai', () => renderFns.current.renderAi())
      registerComponent(gl, 'bottomPanel', () => renderFns.current.renderBottomPanel())

      gl.resizeWithContainerAutomatically = true

      const config = loadSavedConfig() ?? DEFAULT_CONFIG
      try {
        gl.loadLayout(config)
      } catch {
        try { gl.loadLayout(DEFAULT_CONFIG) } catch { /* ignore */ }
      }

      gl.addEventListener('stateChanged', () => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(gl.saveLayout()))
        } catch { /* ignore */ }
      })

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

          <div
            ref={containerRef}
            style={{ flex: 1, position: 'relative', overflow: 'hidden', width: 0, height: '100%' }}
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
)
