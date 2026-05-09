import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockGet = vi.fn()
const mockSet = vi.fn().mockResolvedValue(undefined)

const DEFAULT_SETTINGS = {
  activeProvider: 'anthropic' as const,
  providers: {
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
    openai: { apiKey: '', model: 'gpt-4o' }
  }
}

beforeEach(() => {
  mockGet.mockClear()
  mockSet.mockClear()
  mockGet.mockResolvedValue({ ...DEFAULT_SETTINGS })

  Object.defineProperty(window, 'kode', {
    value: {
      platform: 'test',
      fs: { readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn() },
      terminal: {
        spawn: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {})
      },
      settings: { get: mockGet, set: mockSet },
      ai: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        onToken: vi.fn().mockReturnValue(() => {}),
        onDone: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {})
      },
      setTitle: vi.fn()
    },
    writable: true,
    configurable: true
  })
})

import { useSettings } from '@renderer/hooks/useSettings'

describe('useSettings', () => {
  it('starts with loading=true and null settings', () => {
    mockGet.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useSettings())
    expect(result.current.loading).toBe(true)
    expect(result.current.settings).toBeNull()
  })

  it('loads settings on mount', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => { await Promise.resolve() })
    expect(result.current.loading).toBe(false)
    expect(result.current.settings?.activeProvider).toBe('anthropic')
  })

  it('updateSettings calls window.kode.settings.set and updates state', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => { await Promise.resolve() })

    const next = {
      activeProvider: 'openai' as const,
      providers: {
        anthropic: { apiKey: 'sk-ant', model: 'claude-sonnet-4-6' },
        openai: { apiKey: 'sk-oai', model: 'gpt-4o' }
      }
    }
    await act(async () => { await result.current.updateSettings(next) })

    expect(mockSet).toHaveBeenCalledWith(next)
    expect(result.current.settings?.activeProvider).toBe('openai')
  })

  it('setActiveProvider updates activeProvider in settings', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => { await Promise.resolve() })
    await act(async () => { await result.current.setActiveProvider('openai') })
    expect(result.current.settings?.activeProvider).toBe('openai')
    expect(mockSet).toHaveBeenCalled()
  })

  it('setProviderKey updates the API key for a specific provider', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => { await Promise.resolve() })
    await act(async () => { await result.current.setProviderKey('anthropic', 'sk-new') })
    expect(result.current.settings?.providers.anthropic.apiKey).toBe('sk-new')
    expect(mockSet).toHaveBeenCalled()
  })

  it('setProviderModel updates the model for a specific provider', async () => {
    const { result } = renderHook(() => useSettings())
    await act(async () => { await Promise.resolve() })
    await act(async () => { await result.current.setProviderModel('anthropic', 'claude-opus-4-6') })
    expect(result.current.settings?.providers.anthropic.model).toBe('claude-opus-4-6')
    expect(mockSet).toHaveBeenCalled()
  })
})
