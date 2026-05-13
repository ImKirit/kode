import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'

function makeCallbacks(overrides = {}) {
  return {
    onToggleSidebar: vi.fn(),
    onToggleBottomPanel: vi.fn(),
    onToggleAiPanel: vi.fn(),
    onSaveFile: vi.fn(),
    onOpenFolder: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides
  }
}

function keyDown(key: string, mods: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...mods }))
}

describe('useKeyboardShortcuts', () => {
  it('fires onToggleSidebar on Ctrl+B (default)', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    keyDown('b', { ctrlKey: true })
    expect(cbs.onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleBottomPanel on Ctrl+J', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    keyDown('j', { ctrlKey: true })
    expect(cbs.onToggleBottomPanel).toHaveBeenCalledTimes(1)
  })

  it('fires onToggleAiPanel on Ctrl+Shift+A', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    keyDown('A', { ctrlKey: true, shiftKey: true })
    expect(cbs.onToggleAiPanel).toHaveBeenCalledTimes(1)
  })

  it('fires onSaveFile on Ctrl+S', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    keyDown('s', { ctrlKey: true })
    expect(cbs.onSaveFile).toHaveBeenCalledTimes(1)
  })

  it('fires onOpenSettings on Ctrl+,', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    keyDown(',', { ctrlKey: true })
    expect(cbs.onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('does not fire onToggleSidebar on plain B (no Ctrl)', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts(cbs))
    keyDown('b')
    expect(cbs.onToggleSidebar).not.toHaveBeenCalled()
  })

  it('uses custom keybinding override for toggleSidebar', () => {
    const cbs = makeCallbacks()
    renderHook(() => useKeyboardShortcuts({ ...cbs, keybindings: { toggleSidebar: 'Ctrl+E' } }))
    keyDown('e', { ctrlKey: true })
    expect(cbs.onToggleSidebar).toHaveBeenCalledTimes(1)
    keyDown('b', { ctrlKey: true })
    expect(cbs.onToggleSidebar).toHaveBeenCalledTimes(1) // not called again
  })

  it('cleans up event listener on unmount', () => {
    const cbs = makeCallbacks()
    const { unmount } = renderHook(() => useKeyboardShortcuts(cbs))
    unmount()
    keyDown('b', { ctrlKey: true })
    expect(cbs.onToggleSidebar).not.toHaveBeenCalled()
  })
})
