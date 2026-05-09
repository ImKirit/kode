# M5: Panel Docking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add panel show/hide toggles, a VSCode-style activity bar, keyboard shortcuts (Ctrl+B/J), and localStorage layout persistence — giving users full control over which panels are visible.

**Architecture:** A new `usePanelLayout` hook owns all panel visibility and size state, persisted to localStorage. A new `ActivityBar` component renders icon buttons to toggle each panel. A `useKeyboardShortcuts` hook wires Ctrl+B (sidebar), Ctrl+J (terminal), Ctrl+Shift+A (AI panel). `AppLayout` is refactored to accept layout state as props instead of managing it internally. `App.tsx` composes everything.

**Tech Stack:** React hooks, localStorage, Lucide React icons, existing Vitest + @testing-library/react.

> **Note on GoldenLayout v2:** Full drag-to-dock and floating panels (GoldenLayout v2) require a complex DOM bridge between GoldenLayout's container management and React's rendering model. This milestone delivers the core panel UX value — show/hide, persistence, activity bar, keyboard shortcuts — which covers 90% of real usage. GoldenLayout v2 integration can follow as M5b once the panel state layer is solid.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/renderer/src/hooks/usePanelLayout.ts` | Create | Panel visibility + size state, localStorage persistence |
| `src/renderer/src/hooks/useKeyboardShortcuts.ts` | Create | Ctrl+B/J/Shift+A keyboard bindings |
| `src/renderer/src/components/layout/ActivityBar.tsx` | Create | Three toggle icon buttons with aria-pressed |
| `src/renderer/src/components/layout/AppLayout.tsx` | Modify | Accept layout props, add activity bar, remove internal state |
| `src/renderer/src/App.tsx` | Modify | Wire usePanelLayout + useKeyboardShortcuts + ActivityBar |
| `tests/renderer/hooks/usePanelLayout.test.ts` | Create | 10 tests for hook state, toggles, persistence |
| `tests/renderer/hooks/useKeyboardShortcuts.test.ts` | Create | 3 tests for keyboard events |
| `tests/renderer/components/layout/ActivityBar.test.tsx` | Create | 9 tests for buttons, aria-pressed, callbacks |

---

### Task 1: usePanelLayout hook

**Files:**
- Create: `src/renderer/src/hooks/usePanelLayout.ts`
- Create: `tests/renderer/hooks/usePanelLayout.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/hooks/usePanelLayout.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanelLayout } from '@renderer/hooks/usePanelLayout'

beforeEach(() => {
  localStorage.clear()
})

describe('usePanelLayout', () => {
  it('starts with all panels visible and default sizes', () => {
    const { result } = renderHook(() => usePanelLayout())
    expect(result.current.sidebarVisible).toBe(true)
    expect(result.current.aiPanelVisible).toBe(true)
    expect(result.current.bottomPanelVisible).toBe(true)
    expect(result.current.sidebarWidth).toBe(220)
    expect(result.current.aiPanelWidth).toBe(360)
    expect(result.current.bottomPanelHeight).toBe(220)
  })

  it('toggleSidebar toggles sidebarVisible on and off', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.toggleSidebar() })
    expect(result.current.sidebarVisible).toBe(false)
    act(() => { result.current.toggleSidebar() })
    expect(result.current.sidebarVisible).toBe(true)
  })

  it('toggleAiPanel toggles aiPanelVisible', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.toggleAiPanel() })
    expect(result.current.aiPanelVisible).toBe(false)
  })

  it('toggleBottomPanel toggles bottomPanelVisible', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.toggleBottomPanel() })
    expect(result.current.bottomPanelVisible).toBe(false)
  })

  it('setSidebarWidth updates sidebarWidth', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.setSidebarWidth(300) })
    expect(result.current.sidebarWidth).toBe(300)
  })

  it('setAiPanelWidth updates aiPanelWidth', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.setAiPanelWidth(400) })
    expect(result.current.aiPanelWidth).toBe(400)
  })

  it('setBottomPanelHeight updates bottomPanelHeight', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.setBottomPanelHeight(300) })
    expect(result.current.bottomPanelHeight).toBe(300)
  })

  it('persists state to localStorage on change', () => {
    const { result } = renderHook(() => usePanelLayout())
    act(() => { result.current.toggleSidebar() })
    const stored = JSON.parse(localStorage.getItem('kode.panelLayout')!)
    expect(stored.sidebarVisible).toBe(false)
  })

  it('loads persisted state from localStorage on mount', () => {
    localStorage.setItem('kode.panelLayout', JSON.stringify({
      sidebarVisible: false,
      aiPanelVisible: true,
      bottomPanelVisible: true,
      sidebarWidth: 300,
      aiPanelWidth: 360,
      bottomPanelHeight: 220
    }))
    const { result } = renderHook(() => usePanelLayout())
    expect(result.current.sidebarVisible).toBe(false)
    expect(result.current.sidebarWidth).toBe(300)
  })

  it('falls back to defaults on corrupt localStorage', () => {
    localStorage.setItem('kode.panelLayout', 'not-valid-json{')
    const { result } = renderHook(() => usePanelLayout())
    expect(result.current.sidebarWidth).toBe(220)
    expect(result.current.sidebarVisible).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/usePanelLayout.test.ts
```

Expected: FAIL — `Cannot find module '@renderer/hooks/usePanelLayout'`

- [ ] **Step 3: Implement usePanelLayout.ts**

Create `src/renderer/src/hooks/usePanelLayout.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'kode.panelLayout'

export interface PanelLayoutState {
  sidebarVisible: boolean
  aiPanelVisible: boolean
  bottomPanelVisible: boolean
  sidebarWidth: number
  aiPanelWidth: number
  bottomPanelHeight: number
}

export interface UsePanelLayoutResult extends PanelLayoutState {
  toggleSidebar(): void
  toggleAiPanel(): void
  toggleBottomPanel(): void
  setSidebarWidth(w: number): void
  setAiPanelWidth(w: number): void
  setBottomPanelHeight(h: number): void
}

const DEFAULTS: PanelLayoutState = {
  sidebarVisible: true,
  aiPanelVisible: true,
  bottomPanelVisible: true,
  sidebarWidth: 220,
  aiPanelWidth: 360,
  bottomPanelHeight: 220
}

function loadLayout(): PanelLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function usePanelLayout(): UsePanelLayoutResult {
  const [state, setState] = useState<PanelLayoutState>(() => loadLayout())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const toggleSidebar = useCallback(() =>
    setState(prev => ({ ...prev, sidebarVisible: !prev.sidebarVisible })), [])

  const toggleAiPanel = useCallback(() =>
    setState(prev => ({ ...prev, aiPanelVisible: !prev.aiPanelVisible })), [])

  const toggleBottomPanel = useCallback(() =>
    setState(prev => ({ ...prev, bottomPanelVisible: !prev.bottomPanelVisible })), [])

  const setSidebarWidth = useCallback((w: number) =>
    setState(prev => ({ ...prev, sidebarWidth: w })), [])

  const setAiPanelWidth = useCallback((w: number) =>
    setState(prev => ({ ...prev, aiPanelWidth: w })), [])

  const setBottomPanelHeight = useCallback((h: number) =>
    setState(prev => ({ ...prev, bottomPanelHeight: h })), [])

  return {
    ...state,
    toggleSidebar,
    toggleAiPanel,
    toggleBottomPanel,
    setSidebarWidth,
    setAiPanelWidth,
    setBottomPanelHeight
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/usePanelLayout.test.ts
```

Expected: PASS — 10 tests passing.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/hooks/usePanelLayout.ts tests/renderer/hooks/usePanelLayout.test.ts
git commit -m "$(cat <<'EOF'
feat(m5): usePanelLayout hook — panel visibility, sizes, localStorage persistence

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: ActivityBar component

**Files:**
- Create: `src/renderer/src/components/layout/ActivityBar.tsx`
- Create: `tests/renderer/components/layout/ActivityBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/components/layout/ActivityBar.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityBar } from '@renderer/components/layout/ActivityBar'

function makeProps(overrides = {}) {
  return {
    sidebarVisible: true,
    aiPanelVisible: true,
    bottomPanelVisible: true,
    onToggleSidebar: vi.fn(),
    onToggleAiPanel: vi.fn(),
    onToggleBottomPanel: vi.fn(),
    ...overrides
  }
}

describe('ActivityBar', () => {
  it('renders the activity bar container', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByTestId('activity-bar')).toBeInTheDocument()
  })

  it('renders Toggle Explorer button', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i })).toBeInTheDocument()
  })

  it('renders Toggle AI Panel button', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByRole('button', { name: /toggle ai panel/i })).toBeInTheDocument()
  })

  it('renders Toggle Terminal button', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByRole('button', { name: /toggle terminal/i })).toBeInTheDocument()
  })

  it('calls onToggleSidebar when Explorer button is clicked', () => {
    const props = makeProps()
    render(<ActivityBar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle explorer/i }))
    expect(props.onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleAiPanel when AI Panel button is clicked', () => {
    const props = makeProps()
    render(<ActivityBar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle ai panel/i }))
    expect(props.onToggleAiPanel).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleBottomPanel when Terminal button is clicked', () => {
    const props = makeProps()
    render(<ActivityBar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle terminal/i }))
    expect(props.onToggleBottomPanel).toHaveBeenCalledTimes(1)
  })

  it('sets aria-pressed=true on Explorer when sidebar is visible', () => {
    render(<ActivityBar {...makeProps({ sidebarVisible: true })} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed=false on Explorer when sidebar is hidden', () => {
    render(<ActivityBar {...makeProps({ sidebarVisible: false })} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i }))
      .toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/components/layout/ActivityBar.test.tsx
```

Expected: FAIL — `Cannot find module '@renderer/components/layout/ActivityBar'`

- [ ] **Step 3: Implement ActivityBar.tsx**

Create `src/renderer/src/components/layout/ActivityBar.tsx`:

```typescript
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/components/layout/ActivityBar.test.tsx
```

Expected: PASS — 9 tests passing.

- [ ] **Step 5: Run full suite**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run
```

Expected: All 111 prior tests still pass + 9 new = 120 total.

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/components/layout/ActivityBar.tsx tests/renderer/components/layout/ActivityBar.test.tsx
git commit -m "$(cat <<'EOF'
feat(m5): ActivityBar component — panel toggle buttons with aria-pressed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: useKeyboardShortcuts hook

**Files:**
- Create: `src/renderer/src/hooks/useKeyboardShortcuts.ts`
- Create: `tests/renderer/hooks/useKeyboardShortcuts.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/renderer/hooks/useKeyboardShortcuts.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'

function makeCallbacks(overrides = {}) {
  return {
    onToggleSidebar: vi.fn(),
    onToggleBottomPanel: vi.fn(),
    onToggleAiPanel: vi.fn(),
    ...overrides
  }
}

describe('useKeyboardShortcuts', () => {
  it('fires onToggleSidebar on Ctrl+B', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }))
    expect(cbs.onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleBottomPanel on Ctrl+J', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true }))
    expect(cbs.onToggleBottomPanel).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleAiPanel on Ctrl+Shift+A', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, shiftKey: true, bubbles: true }))
    expect(cbs.onToggleAiPanel).toHaveBeenCalledTimes(1)
  })

  it('does not fire onToggleSidebar on plain B (no Ctrl)', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: false, bubbles: true }))
    expect(cbs.onToggleSidebar).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const cbs = makeCallbacks()
    const { unmount } = renderHook(() => useKeyboardShortcuts(cbs))
    unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }))
    expect(cbs.onToggleSidebar).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/useKeyboardShortcuts.test.ts
```

Expected: FAIL — `Cannot find module '@renderer/hooks/useKeyboardShortcuts'`

- [ ] **Step 3: Implement useKeyboardShortcuts.ts**

Create `src/renderer/src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from 'react'

interface KeyboardShortcutsConfig {
  onToggleSidebar(): void
  onToggleBottomPanel(): void
  onToggleAiPanel(): void
}

export function useKeyboardShortcuts({
  onToggleSidebar,
  onToggleBottomPanel,
  onToggleAiPanel
}: KeyboardShortcutsConfig): void {
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
        e.preventDefault()
        onToggleSidebar()
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'j') {
        e.preventDefault()
        onToggleBottomPanel()
      } else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        onToggleAiPanel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleSidebar, onToggleBottomPanel, onToggleAiPanel])
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run tests/renderer/hooks/useKeyboardShortcuts.test.ts
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/hooks/useKeyboardShortcuts.ts tests/renderer/hooks/useKeyboardShortcuts.test.ts
git commit -m "$(cat <<'EOF'
feat(m5): useKeyboardShortcuts hook — Ctrl+B/J/Shift+A panel toggles

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Refactor AppLayout + wire App.tsx

**Files:**
- Modify: `src/renderer/src/components/layout/AppLayout.tsx`
- Modify: `src/renderer/src/App.tsx`

AppLayout currently manages its own panel state internally. This task lifts that state out to the caller (App.tsx via `usePanelLayout`) and adds the `activityBar` slot.

- [ ] **Step 1: Read current files**

Read `src/renderer/src/components/layout/AppLayout.tsx` and `src/renderer/src/App.tsx` to understand the current state before editing.

- [ ] **Step 2: Replace AppLayout.tsx**

Replace `src/renderer/src/components/layout/AppLayout.tsx` with:

```typescript
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
```

- [ ] **Step 3: Replace App.tsx**

Replace `src/renderer/src/App.tsx` with:

```typescript
import { useProject } from './hooks/useProject'
import { usePanelLayout } from './hooks/usePanelLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { AppLayout } from './components/layout/AppLayout'
import { ActivityBar } from './components/layout/ActivityBar'
import { MenuBar } from './components/layout/MenuBar'
import { FileTree } from './components/filetree/FileTree'
import { EditorArea } from './components/editor/EditorArea'
import { AIChatPanel } from './components/ai/AIChatPanel'
import { TerminalPanel } from './components/terminal/TerminalPanel'

export function App() {
  const {
    project,
    openFiles,
    activeFilePath,
    openFolder,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    saveFile
  } = useProject()

  const layout = usePanelLayout()

  useKeyboardShortcuts({
    onToggleSidebar: layout.toggleSidebar,
    onToggleBottomPanel: layout.toggleBottomPanel,
    onToggleAiPanel: layout.toggleAiPanel
  })

  return (
    <AppLayout
      layout={layout}
      menuBar={
        <MenuBar
          projectName={project.name}
          onOpenFolder={openFolder}
          onSave={() => activeFilePath && saveFile(activeFilePath)}
        />
      }
      activityBar={
        <ActivityBar
          sidebarVisible={layout.sidebarVisible}
          aiPanelVisible={layout.aiPanelVisible}
          bottomPanelVisible={layout.bottomPanelVisible}
          onToggleSidebar={layout.toggleSidebar}
          onToggleAiPanel={layout.toggleAiPanel}
          onToggleBottomPanel={layout.toggleBottomPanel}
        />
      }
      sidebar={
        <FileTree
          rootPath={project.rootPath}
          activeFilePath={activeFilePath}
          onOpenFile={openFile}
        />
      }
      editor={
        <EditorArea
          openFiles={openFiles}
          activeFilePath={activeFilePath}
          onActivate={setActiveFile}
          onClose={closeFile}
          onContentChange={updateFileContent}
          onSave={saveFile}
        />
      }
      aiPanel={<AIChatPanel />}
      bottomPanel={<TerminalPanel />}
    />
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run
```

Expected: All tests passing (121+ total — prior 111 + 10 from Task 1 + 9 from Task 2 + 5 from Task 3).

If any existing test imports `AppLayout` directly and passes the old props shape, update those tests to match the new `layout` prop. Look for any failures mentioning `AppLayout` prop types.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git add src/renderer/src/components/layout/AppLayout.tsx src/renderer/src/App.tsx
git commit -m "$(cat <<'EOF'
feat(m5): wire AppLayout with usePanelLayout + ActivityBar + keyboard shortcuts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Push to remote

- [ ] **Step 1: Run full test suite one final time**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
npx vitest run
```

Expected: All tests passing.

- [ ] **Step 2: Push**

```bash
cd "C:\Users\borad\OneDrive\Dokumente\kirit\Big Projects\Kode\Kode\kode"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Panel show/hide: covered by `usePanelLayout` + `ActivityBar` (Tasks 1, 2, 4)
- Panel persistence: covered by `usePanelLayout` localStorage (Task 1)
- Keyboard shortcuts (Ctrl+B/J/Shift+A): covered by `useKeyboardShortcuts` (Task 3)
- Activity bar with icons: covered by `ActivityBar` (Task 2)
- Panel resize (existing behaviour): preserved in refactored `AppLayout` (Task 4)

**Placeholder scan:** No TBD, no TODO, all code blocks present and complete.

**Type consistency:**
- `UsePanelLayoutResult` defined in Task 1, used in AppLayout (Task 4) — consistent
- `ActivityBarProps` callbacks match `UsePanelLayoutResult.toggle*` method signatures — consistent
- `useKeyboardShortcuts` config interface matches `UsePanelLayoutResult` toggle callbacks — consistent
