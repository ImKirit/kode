import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClaudeContext } from '../../../src/renderer/src/hooks/useClaudeContext'

const mockLoadContext = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'kode', {
    value: { claude: { loadContext: mockLoadContext } },
    writable: true,
    configurable: true
  })
})

describe('useClaudeContext', () => {
  it('returns null when rootPath is null', () => {
    const { result } = renderHook(() => useClaudeContext(null))
    expect(result.current.systemPrompt).toBeNull()
    expect(result.current.hasContext).toBe(false)
    expect(mockLoadContext).not.toHaveBeenCalled()
  })

  it('loads CLAUDE.md when rootPath is provided', async () => {
    mockLoadContext.mockResolvedValue({ content: '# System' })
    const { result } = renderHook(() => useClaudeContext('/some/project'))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(mockLoadContext).toHaveBeenCalledWith('/some/project')
    expect(result.current.systemPrompt).toBe('# System')
    expect(result.current.hasContext).toBe(true)
  })

  it('returns hasContext false when content is null', async () => {
    mockLoadContext.mockResolvedValue({ content: null })
    const { result } = renderHook(() => useClaudeContext('/no/claude'))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(result.current.hasContext).toBe(false)
    expect(result.current.systemPrompt).toBeNull()
  })

  it('re-fetches when rootPath changes', async () => {
    mockLoadContext.mockResolvedValue({ content: 'A' })
    const { result, rerender } = renderHook(({ p }) => useClaudeContext(p), {
      initialProps: { p: '/proj-a' as string | null }
    })
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(result.current.systemPrompt).toBe('A')

    mockLoadContext.mockResolvedValue({ content: 'B' })
    rerender({ p: '/proj-b' })
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(result.current.systemPrompt).toBe('B')
  })
})
