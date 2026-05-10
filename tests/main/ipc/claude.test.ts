import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Mock electron before importing claude.ts
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }))

let tmpDir: string
let loadClaudeContext: (rootPath: string) => Promise<{ content: string | null }>

beforeAll(async () => {
  tmpDir = await fsp.mkdtemp(join(tmpdir(), 'kode-claude-test-'))
  await fsp.mkdir(join(tmpDir, '.claude'))
  await fsp.writeFile(join(tmpDir, '.claude', 'CLAUDE.md'), '# My instructions')
  const mod = await import('../../../src/main/ipc/claude')
  loadClaudeContext = mod.loadClaudeContext
})

afterAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true })
})

describe('loadClaudeContext', () => {
  it('returns content when CLAUDE.md exists', async () => {
    const result = await loadClaudeContext(tmpDir)
    expect(result.content).toBe('# My instructions')
  })

  it('returns null when CLAUDE.md missing', async () => {
    const result = await loadClaudeContext(tmpdir())
    expect(result.content).toBeNull()
  })

  it('returns null for empty rootPath', async () => {
    const result = await loadClaudeContext('')
    expect(result.content).toBeNull()
  })

  it('returns null for non-string rootPath (null)', async () => {
    const result = await loadClaudeContext(null as unknown as string)
    expect(result.content).toBeNull()
  })
})
