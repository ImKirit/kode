import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGit } from '@renderer/hooks/useGit'

const mockGitStatus = vi.fn().mockResolvedValue([{ path: 'src/foo.ts', status: 'M' }])
const mockGitDiff = vi.fn().mockResolvedValue('--- a/src/foo.ts\n+++ b/src/foo.ts\n-old\n+new')
const mockGitStage = vi.fn().mockResolvedValue(undefined)
const mockGitCommit = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  mockGitStatus.mockClear()
  mockGitDiff.mockClear()
  mockGitStage.mockClear()
  mockGitCommit.mockClear()

  Object.defineProperty(window, 'kode', {
    value: {
      platform: 'test',
      fs: { readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn(),
        watchRoot: vi.fn(), unwatchRoot: vi.fn(), onFileChange: vi.fn().mockReturnValue(() => {}) },
      terminal: { spawn: vi.fn(), write: vi.fn(), resize: vi.fn(), kill: vi.fn(),
        onData: vi.fn().mockReturnValue(() => {}), onExit: vi.fn().mockReturnValue(() => {}) },
      settings: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
      ai: { sendMessage: vi.fn(), stop: vi.fn(),
        onToken: vi.fn().mockReturnValue(() => {}), onDone: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}), onRateLimit: vi.fn().mockReturnValue(() => {}) },
      git: { status: mockGitStatus, diff: mockGitDiff, stage: mockGitStage, commit: mockGitCommit },
      setTitle: vi.fn()
    },
    writable: true,
    configurable: true
  })
})

describe('useGit', () => {
  it('loads status on mount when rootPath is set', async () => {
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    expect(mockGitStatus).toHaveBeenCalledWith('/project')
    expect(result.current.files).toEqual([{ path: 'src/foo.ts', status: 'M' }])
  })

  it('does not load when rootPath is null', async () => {
    renderHook(() => useGit(null))
    await act(async () => {})
    expect(mockGitStatus).not.toHaveBeenCalled()
  })

  it('refresh() re-fetches status', async () => {
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    mockGitStatus.mockClear()
    await act(async () => { result.current.refresh() })
    expect(mockGitStatus).toHaveBeenCalledTimes(1)
  })

  it('selectFile() fetches diff for the file', async () => {
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    await act(async () => { result.current.selectFile('src/foo.ts') })
    expect(mockGitDiff).toHaveBeenCalledWith('/project', 'src/foo.ts')
    expect(result.current.selectedFile).toBe('src/foo.ts')
    expect(result.current.diff).toContain('+new')
  })

  it('stage() calls git.stage and refreshes', async () => {
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    mockGitStatus.mockClear()
    await act(async () => { result.current.stage('src/foo.ts') })
    expect(mockGitStage).toHaveBeenCalledWith('/project', 'src/foo.ts')
    expect(mockGitStatus).toHaveBeenCalledTimes(1)
  })

  it('commit() calls git.commit and resets state', async () => {
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    act(() => { result.current.setCommitMessage('feat: thing') })
    await act(async () => { result.current.commit() })
    expect(mockGitCommit).toHaveBeenCalledWith('/project', 'feat: thing')
    expect(result.current.commitMessage).toBe('')
    expect(result.current.files).toEqual([])
  })

  it('commit() is a no-op when commitMessage is empty', async () => {
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    await act(async () => { result.current.commit() })
    expect(mockGitCommit).not.toHaveBeenCalled()
  })

  it('setCommitMessage updates commitMessage', () => {
    const { result } = renderHook(() => useGit('/project'))
    act(() => { result.current.setCommitMessage('hello') })
    expect(result.current.commitMessage).toBe('hello')
  })

  it('sets error when git:status throws', async () => {
    mockGitStatus.mockRejectedValueOnce(new Error('not a git repo'))
    const { result } = renderHook(() => useGit('/project'))
    await act(async () => {})
    expect(result.current.error).toBe('not a git repo')
  })
})
