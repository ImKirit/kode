import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTerminal } from '@renderer/hooks/useTerminal'

const mockSpawn = vi.fn()
const mockKill = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockSpawn.mockResolvedValue('term-1')
  ;(window as any).kode = {
    terminal: {
      spawn: mockSpawn,
      write: vi.fn(),
      resize: vi.fn(),
      kill: mockKill,
      onData: vi.fn().mockReturnValue(() => {})
    }
  }
})

describe('useTerminal', () => {
  it('starts with no terminals and no active id', () => {
    const { result } = renderHook(() => useTerminal())
    expect(result.current.terminals).toHaveLength(0)
    expect(result.current.activeTermId).toBeNull()
  })

  it('createTerminal: spawns a PTY and adds a tab with correct title', async () => {
    mockSpawn.mockResolvedValueOnce('term-1')
    const { result } = renderHook(() => useTerminal())
    await act(() => result.current.createTerminal())
    expect(result.current.terminals).toHaveLength(1)
    expect(result.current.terminals[0].id).toBe('term-1')
    expect(result.current.terminals[0].title).toBe('Terminal 1')
    expect(result.current.activeTermId).toBe('term-1')
  })

  it('createTerminal: increments the title counter on each call', async () => {
    mockSpawn
      .mockResolvedValueOnce('term-1')
      .mockResolvedValueOnce('term-2')
    const { result } = renderHook(() => useTerminal())
    await act(() => result.current.createTerminal())
    await act(() => result.current.createTerminal())
    expect(result.current.terminals[0].title).toBe('Terminal 1')
    expect(result.current.terminals[1].title).toBe('Terminal 2')
  })

  it('closeTerminal: removes the tab and kills the PTY', async () => {
    mockSpawn.mockResolvedValueOnce('term-1')
    const { result } = renderHook(() => useTerminal())
    await act(() => result.current.createTerminal())
    act(() => result.current.closeTerminal('term-1'))
    expect(result.current.terminals).toHaveLength(0)
    expect(result.current.activeTermId).toBeNull()
    expect(mockKill).toHaveBeenCalledWith('term-1')
  })

  it('closeTerminal: activates the previous tab when closing the active one', async () => {
    mockSpawn
      .mockResolvedValueOnce('term-1')
      .mockResolvedValueOnce('term-2')
    const { result } = renderHook(() => useTerminal())
    await act(() => result.current.createTerminal())
    await act(() => result.current.createTerminal())
    // term-2 is now active — closing it should fall back to term-1
    act(() => result.current.closeTerminal('term-2'))
    expect(result.current.activeTermId).toBe('term-1')
  })

  it('setActiveTerminal: switches the active terminal', async () => {
    mockSpawn
      .mockResolvedValueOnce('term-1')
      .mockResolvedValueOnce('term-2')
    const { result } = renderHook(() => useTerminal())
    await act(() => result.current.createTerminal())
    await act(() => result.current.createTerminal())
    act(() => result.current.setActiveTerminal('term-1'))
    expect(result.current.activeTermId).toBe('term-1')
  })
})
