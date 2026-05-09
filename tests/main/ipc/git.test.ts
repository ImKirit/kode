import { describe, it, expect, vi, beforeEach } from 'vitest'

const handles: Record<string, (...args: unknown[]) => unknown> = {}

const { mockStatus, mockDiff, mockAdd, mockCommit, mockSimpleGit } = vi.hoisted(() => {
  const mockStatus = vi.fn().mockResolvedValue({
    files: [
      { path: 'src/foo.ts', working_dir: 'M', index: ' ' },
      { path: 'src/bar.ts', working_dir: ' ', index: 'A' }
    ]
  })
  const mockDiff = vi.fn().mockResolvedValue('--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1 +1 @@\n-old\n+new')
  const mockAdd = vi.fn().mockResolvedValue(undefined)
  const mockCommit = vi.fn().mockResolvedValue(undefined)
  const mockSimpleGit = vi.fn(() => ({ status: mockStatus, diff: mockDiff, add: mockAdd, commit: mockCommit }))
  return { mockStatus, mockDiff, mockAdd, mockCommit, mockSimpleGit }
})

vi.mock('simple-git', () => ({ default: mockSimpleGit }))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((ch: string, handler: (...args: unknown[]) => unknown) => { handles[ch] = handler })
  }
}))

describe('registerGitHandlers', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    Object.keys(handles).forEach(k => delete handles[k])
  })

  it('registers git:status, git:diff, git:stage, git:commit handles', async () => {
    const { registerGitHandlers, _resetRegistered } = await import('../../../src/main/ipc/git')
    _resetRegistered()
    registerGitHandlers()
    expect(handles['git:status']).toBeDefined()
    expect(handles['git:diff']).toBeDefined()
    expect(handles['git:stage']).toBeDefined()
    expect(handles['git:commit']).toBeDefined()
  })

  it('git:status returns mapped file array', async () => {
    const { registerGitHandlers, _resetRegistered } = await import('../../../src/main/ipc/git')
    _resetRegistered()
    registerGitHandlers()
    const result = await handles['git:status']!({}, '/project') as { path: string; status: string }[]
    expect(mockSimpleGit).toHaveBeenCalledWith('/project')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ path: 'src/foo.ts', status: 'M' })
    expect(result[1]).toEqual({ path: 'src/bar.ts', status: 'A' })
  })

  it('git:diff returns diff string', async () => {
    const { registerGitHandlers, _resetRegistered } = await import('../../../src/main/ipc/git')
    _resetRegistered()
    registerGitHandlers()
    const result = await handles['git:diff']!({}, '/project', 'src/foo.ts')
    expect(typeof result).toBe('string')
    expect(result).toContain('+new')
  })

  it('git:stage calls git.add with filePath', async () => {
    const { registerGitHandlers, _resetRegistered } = await import('../../../src/main/ipc/git')
    _resetRegistered()
    registerGitHandlers()
    await handles['git:stage']!({}, '/project', 'src/foo.ts')
    expect(mockAdd).toHaveBeenCalledWith('src/foo.ts')
  })

  it('git:commit calls git.commit with message', async () => {
    const { registerGitHandlers, _resetRegistered } = await import('../../../src/main/ipc/git')
    _resetRegistered()
    registerGitHandlers()
    await handles['git:commit']!({}, '/project', 'feat: add thing')
    expect(mockCommit).toHaveBeenCalledWith('feat: add thing')
  })
})
