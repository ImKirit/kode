import { describe, it, expect, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

vi.mock('electron', () => ({
  dialog: { showOpenDialog: vi.fn() }
}))

// Test handler logic in isolation — no Electron required
import { readDirHandler, readFileHandler, writeFileHandler } from '../../../src/main/ipc/fs'

describe('readDirHandler', () => {
  it('returns FileEntry array sorted: directories first, then files', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kode-test-'))
    await fs.writeFile(path.join(dir, 'hello.ts'), 'const x = 1')
    await fs.mkdir(path.join(dir, 'subdir'))

    const entries = await readDirHandler(dir)

    expect(entries.some(e => e.name === 'hello.ts' && e.type === 'file')).toBe(true)
    expect(entries.some(e => e.name === 'subdir' && e.type === 'directory')).toBe(true)
    // directories come first
    expect(entries[0].type).toBe('directory')

    await fs.rm(dir, { recursive: true })
  })

  it('hides dotfiles', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kode-test-'))
    await fs.writeFile(path.join(dir, '.hidden'), 'secret')
    await fs.writeFile(path.join(dir, 'visible.ts'), '')

    const entries = await readDirHandler(dir)

    expect(entries.some(e => e.name === '.hidden')).toBe(false)
    expect(entries.some(e => e.name === 'visible.ts')).toBe(true)

    await fs.rm(dir, { recursive: true })
  })
})

describe('readFileHandler', () => {
  it('returns file content as UTF-8 string', async () => {
    const tmp = path.join(os.tmpdir(), 'kode-test-read.ts')
    await fs.writeFile(tmp, 'const hello = "world"')
    const content = await readFileHandler(tmp)
    expect(content).toBe('const hello = "world"')
    await fs.unlink(tmp)
  })
})

describe('writeFileHandler', () => {
  it('writes content to disk', async () => {
    const tmp = path.join(os.tmpdir(), 'kode-test-write.ts')
    await writeFileHandler(tmp, 'const x = 42')
    const content = await fs.readFile(tmp, 'utf-8')
    expect(content).toBe('const x = 42')
    await fs.unlink(tmp)
  })
})
