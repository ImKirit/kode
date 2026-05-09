import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '@renderer/hooks/useTheme'

const mockSetProperty = vi.fn()
const mockStyle = { setProperty: mockSetProperty }

beforeEach(() => {
  mockSetProperty.mockClear()
  localStorage.clear()
  Object.defineProperty(document, 'documentElement', {
    value: { style: mockStyle },
    writable: true,
    configurable: true
  })
})

describe('useTheme', () => {
  it('defaults to light theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('kode.theme', JSON.stringify({ name: 'dark', primary: '', accent: '' }))
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('setTheme updates theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('dark') })
    expect(result.current.theme).toBe('dark')
    const stored = JSON.parse(localStorage.getItem('kode.theme') ?? '{}')
    expect(stored.name).toBe('dark')
  })

  it('applies CSS variables to documentElement on mount', () => {
    renderHook(() => useTheme())
    expect(mockSetProperty).toHaveBeenCalled()
  })

  it('applies CSS variables when theme changes', () => {
    const { result } = renderHook(() => useTheme())
    mockSetProperty.mockClear()
    act(() => { result.current.setTheme('dark') })
    expect(mockSetProperty).toHaveBeenCalled()
  })

  it('setCustomColors updates custom theme primary and accent', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setCustomColors('#ff0000', '#00ff00') })
    expect(result.current.customPrimary).toBe('#ff0000')
    expect(result.current.customAccent).toBe('#00ff00')
  })
})
