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
