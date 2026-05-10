import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { callFilesystemTool } from '../../../src/main/mcp/builtins/filesystem'

let tmpDir: string

beforeAll(async () => {
  tmpDir = await fsp.mkdtemp(join(tmpdir(), 'kode-fs-test-'))
  await fsp.writeFile(join(tmpDir, 'hello.txt'), 'hello world')
  await fsp.mkdir(join(tmpDir, 'sub'))
  await fsp.writeFile(join(tmpDir, 'sub', 'deep.ts'), 'export {}')
})

afterAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true })
})

describe('read_file', () => {
  it('returns file content', async () => {
    const result = await callFilesystemTool('read_file', { path: join(tmpDir, 'hello.txt') })
    expect(result.isError).toBe(false)
    expect(result.content).toBe('hello world')
  })

  it('returns error for missing file', async () => {
    const result = await callFilesystemTool('read_file', { path: join(tmpDir, 'nope.txt') })
    expect(result.isError).toBe(true)
  })

  it('rejects relative path', async () => {
    const result = await callFilesystemTool('read_file', { path: 'relative/path' })
    expect(result.isError).toBe(true)
    expect(result.content).toMatch(/absolute/i)
  })
})

describe('write_file', () => {
  it('writes content to file', async () => {
    const path = join(tmpDir, 'written.txt')
    const result = await callFilesystemTool('write_file', { path, content: 'written!' })
    expect(result.isError).toBe(false)
    const content = await fsp.readFile(path, 'utf-8')
    expect(content).toBe('written!')
  })
})

describe('list_directory', () => {
  it('lists files in directory', async () => {
    const result = await callFilesystemTool('list_directory', { path: tmpDir })
    expect(result.isError).toBe(false)
    expect(result.content).toContain('hello.txt')
    expect(result.content).toContain('sub')
  })
})

describe('search_files', () => {
  it('finds files matching pattern', async () => {
    const result = await callFilesystemTool('search_files', { rootPath: tmpDir, pattern: '**/*.ts' })
    expect(result.isError).toBe(false)
    expect(result.content).toContain('deep.ts')
  })

  it('returns empty when no match', async () => {
    const result = await callFilesystemTool('search_files', { rootPath: tmpDir, pattern: '**/*.xyz' })
    expect(result.isError).toBe(false)
    expect(result.content).toBe('')
  })
})

describe('unknown tool', () => {
  it('returns error', async () => {
    const result = await callFilesystemTool('unknown_tool', {})
    expect(result.isError).toBe(true)
  })
})
