import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoFollow } from '@renderer/hooks/useAutoFollow'

const mockWatchRoot = vi.fn().mockResolvedValue(undefined)
const mockUnwatchRoot = vi.fn()
let fileChangeCb: ((filePath: string, content: string) => void) | null = null

const mockOpenFile = vi.fn().mockResolvedValue(undefined)
const mockUpdateFileContent = vi.fn()
const mockSetActiveFile = vi.fn()

beforeEach(() => {
  mockWatchRoot.mockClear()
  mockUnwatchRoot.mockClear()
  mockOpenFile.mockClear()
  mockUpdateFileContent.mockClear()
  mockSetActiveFile.mockClear()
  fileChangeCb = null
  localStorage.clear()

  Object.defineProperty(window, 'kode', {
    value: {
      platform: 'test',
      fs: {
        readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn(),
        watchRoot: mockWatchRoot,
        unwatchRoot: mockUnwatchRoot,
        onFileChange: (cb: (filePath: string, content: string) => void) => {
          fileChangeCb = cb
          return () => { fileChangeCb = null }
        }
      },
      terminal: {
        spawn: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}),
        onExit: vi.fn().mockReturnValue(() => {})
      },
      settings: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
      ai: {
        sendMessage: vi.fn(), stop: vi.fn(),
        onToken: vi.fn().mockReturnValue(() => {}),
        onDone: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        onRateLimit: vi.fn().mockReturnValue(() => {})
      },
      setTitle: vi.fn()
    },
    writable: true,
    configurable: true
  })
})

const defaultDeps = () => ({
  rootPath: '/my/project',
  openFiles: [],
  openFile: mockOpenFile,
  updateFileContent: mockUpdateFileContent,
  setActiveFile: mockSetActiveFile
})

describe('useAutoFollow', () => {
  it('initial state: enabled is false', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    expect(result.current.enabled).toBe(false)
  })

  it('toggle() enables auto follow', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    act(() => { result.current.toggle() })
    expect(result.current.enabled).toBe(true)
  })

  it('toggle() twice returns to false', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    act(() => { result.current.toggle() })
    act(() => { result.current.toggle() })
    expect(result.current.enabled).toBe(false)
  })

  it('persists enabled to localStorage', () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    act(() => { result.current.toggle() })
    expect(localStorage.getItem('kode.autoFollow')).toBe('true')
  })

  it('restores enabled from localStorage on mount', () => {
    localStorage.setItem('kode.autoFollow', 'true')
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    expect(result.current.enabled).toBe(true)
  })

  it('calls watchRoot when enabled becomes true with a rootPath', async () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    await act(async () => { result.current.toggle() })
    expect(mockWatchRoot).toHaveBeenCalledWith('/my/project')
  })

  it('calls unwatchRoot when enabled becomes false', async () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    await act(async () => { result.current.toggle() })
    await act(async () => { result.current.toggle() })
    expect(mockUnwatchRoot).toHaveBeenCalled()
  })

  it('onFileChange opens file when not already open', async () => {
    const { result } = renderHook(() => useAutoFollow(defaultDeps()))
    await act(async () => { result.current.toggle() })
    await act(async () => { fileChangeCb?.('/my/project/foo.ts', 'new content') })
    expect(mockOpenFile).toHaveBeenCalledWith('/my/project/foo.ts')
    expect(mockUpdateFileContent).not.toHaveBeenCalled()
  })

  it('onFileChange updates content when file is already open', async () => {
    const deps = {
      ...defaultDeps(),
      openFiles: [{ path: '/my/project/foo.ts', name: 'foo.ts', content: 'old', dirty: false, language: 'typescript' }]
    }
    const { result } = renderHook(() => useAutoFollow(deps))
    await act(async () => { result.current.toggle() })
    await act(async () => { fileChangeCb?.('/my/project/foo.ts', 'new content') })
    expect(mockUpdateFileContent).toHaveBeenCalledWith('/my/project/foo.ts', 'new content')
    expect(mockSetActiveFile).toHaveBeenCalledWith('/my/project/foo.ts')
    expect(mockOpenFile).not.toHaveBeenCalled()
  })
})
