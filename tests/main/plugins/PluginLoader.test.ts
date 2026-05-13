import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PluginLoader } from '../../../src/main/plugins/PluginLoader'

type ExecCb = (err: Error | null) => void
type HttpRes = { on(event: string, cb: (...args: unknown[]) => void): HttpRes }
type HttpReq = { on(event: string, cb: (err: Error) => void): HttpReq }

function mockExecFn(err: Error | null = null) {
  return vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: ExecCb) => cb(err))
}

function mockHttpGet(responseData: string, error?: Error): ReturnType<typeof vi.fn> {
  return vi.fn((
    _url: string,
    cb: (res: HttpRes) => void
  ): HttpReq => {
    if (error) {
      const req = { on: vi.fn((_evt: string, errCb: (e: Error) => void) => { errCb(error); return req }) }
      return req
    }
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
    const res: HttpRes = {
      on: (evt, handler) => {
        listeners[evt] = listeners[evt] ?? []
        listeners[evt].push(handler)
        return res
      }
    }
    cb(res)
    Promise.resolve().then(() => {
      listeners['data']?.forEach(h => h(responseData))
      listeners['end']?.forEach(h => h())
    })
    return { on: vi.fn().mockReturnThis() }
  })
}

describe('PluginLoader', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(join(tmpdir(), 'kode-plugins-test-'))
  })

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true })
  })

  describe('list()', () => {
    it('returns empty array when node_modules missing', async () => {
      const loader = new PluginLoader(tmpDir)
      const result = await loader.list()
      expect(result).toEqual([])
    })

    it('returns installed plugins from node_modules', async () => {
      const pkgDir = join(tmpDir, 'node_modules', 'kode-plugin-git')
      await fsp.mkdir(pkgDir, { recursive: true })
      await fsp.writeFile(join(pkgDir, 'package.json'), JSON.stringify({
        name: 'kode-plugin-git',
        version: '1.2.3',
        description: 'Git integration plugin',
        keywords: ['kode-plugin']
      }))
      const loader = new PluginLoader(tmpDir)
      const result = await loader.list()
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'kode-plugin-git',
        name: 'kode-plugin-git',
        version: '1.2.3',
        description: 'Git integration plugin',
        installed: true
      })
    })

    it('skips packages without kode-plugin keyword', async () => {
      const pkgDir = join(tmpDir, 'node_modules', 'some-other-package')
      await fsp.mkdir(pkgDir, { recursive: true })
      await fsp.writeFile(join(pkgDir, 'package.json'), JSON.stringify({
        name: 'some-other-package',
        version: '1.0.0',
        keywords: ['utility']
      }))
      const loader = new PluginLoader(tmpDir)
      const result = await loader.list()
      expect(result).toEqual([])
    })

    it('skips entries without package.json', async () => {
      const pkgDir = join(tmpDir, 'node_modules', 'broken-pkg')
      await fsp.mkdir(pkgDir, { recursive: true })
      const loader = new PluginLoader(tmpDir)
      const result = await loader.list()
      expect(result).toEqual([])
    })

    it('skips dot entries in node_modules', async () => {
      await fsp.mkdir(join(tmpDir, 'node_modules'), { recursive: true })
      await fsp.mkdir(join(tmpDir, 'node_modules', '.package-lock'))
      const loader = new PluginLoader(tmpDir)
      const result = await loader.list()
      expect(result).toEqual([])
    })
  })

  describe('search()', () => {
    it('returns search results from npm registry', async () => {
      const payload = JSON.stringify({
        objects: [
          {
            package: {
              name: 'kode-plugin-eslint',
              description: 'ESLint plugin',
              version: '2.0.0'
            },
            downloads: { monthly: 5000 }
          }
        ]
      })
      const loader = new PluginLoader(tmpDir, { httpGet: mockHttpGet(payload) })
      const results = await loader.search('eslint')
      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        id: 'kode-plugin-eslint',
        description: 'ESLint plugin',
        version: '2.0.0',
        downloads: 5000
      })
    })

    it('returns empty array on HTTP error', async () => {
      const loader = new PluginLoader(tmpDir, {
        httpGet: mockHttpGet('', new Error('network error'))
      })
      const results = await loader.search('something')
      expect(results).toEqual([])
    })

    it('returns empty array on invalid JSON', async () => {
      const loader = new PluginLoader(tmpDir, { httpGet: mockHttpGet('not-json') })
      const results = await loader.search('test')
      expect(results).toEqual([])
    })
  })

  describe('install()', () => {
    it('calls execFile with npm install and package id', async () => {
      const execFn = mockExecFn(null)
      const loader = new PluginLoader(tmpDir, { execFn })
      await loader.install('kode-plugin-git')
      expect(execFn).toHaveBeenCalledWith(
        expect.stringContaining('npm'),
        expect.arrayContaining(['install', 'kode-plugin-git']),
        expect.objectContaining({ cwd: tmpDir }),
        expect.any(Function)
      )
    })

    it('throws when npm install fails', async () => {
      const execFn = mockExecFn(new Error('install failed'))
      const loader = new PluginLoader(tmpDir, { execFn })
      await expect(loader.install('bad-pkg')).rejects.toThrow('install failed')
    })
  })

  describe('uninstall()', () => {
    it('calls execFile with npm uninstall and package id', async () => {
      const execFn = mockExecFn(null)
      const loader = new PluginLoader(tmpDir, { execFn })
      await loader.uninstall('kode-plugin-git')
      expect(execFn).toHaveBeenCalledWith(
        expect.stringContaining('npm'),
        expect.arrayContaining(['uninstall', 'kode-plugin-git']),
        expect.objectContaining({ cwd: tmpDir }),
        expect.any(Function)
      )
    })

    it('throws when npm uninstall fails', async () => {
      const execFn = mockExecFn(new Error('uninstall failed'))
      const loader = new PluginLoader(tmpDir, { execFn })
      await expect(loader.uninstall('bad-pkg')).rejects.toThrow('uninstall failed')
    })
  })
})
