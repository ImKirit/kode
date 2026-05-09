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
