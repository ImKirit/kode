import { execFile as _execFile } from 'node:child_process'
import { get as _httpsGet } from 'node:https'
import { readdir, readFile, mkdir, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import type { PluginMeta, PluginSearchResult } from './types'

const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm'

type ExecFileFn = (
  cmd: string,
  args: string[],
  opts: { cwd: string },
  cb: (err: Error | null) => void
) => void

type HttpsGetFn = (
  url: string,
  cb: (res: { on(event: string, cb: (...args: unknown[]) => void): unknown }) => void
) => { on(event: string, cb: (err: Error) => void): unknown }

export class PluginLoader {
  private readonly execFn: ExecFileFn
  private readonly httpGet: HttpsGetFn

  constructor(
    private readonly pluginsDir: string,
    deps?: { execFn?: ExecFileFn; httpGet?: HttpsGetFn }
  ) {
    this.execFn = deps?.execFn ?? (_execFile as unknown as ExecFileFn)
    this.httpGet = deps?.httpGet ?? (_httpsGet as unknown as HttpsGetFn)
  }

  async list(): Promise<PluginMeta[]> {
    const modulesDir = join(this.pluginsDir, 'node_modules')
    try {
      await access(modulesDir, constants.F_OK)
    } catch {
      return []
    }

    const entries = await readdir(modulesDir, { withFileTypes: true })
    const plugins: PluginMeta[] = []

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      try {
        const pkgPath = join(modulesDir, entry.name, 'package.json')
        const raw = await readFile(pkgPath, 'utf-8')
        const pkg = JSON.parse(raw) as {
          name?: string
          version?: string
          description?: string
          keywords?: string[]
        }
        if (!pkg.keywords?.includes('kode-plugin')) continue
        plugins.push({
          id: pkg.name ?? entry.name,
          name: pkg.name ?? entry.name,
          version: pkg.version ?? '0.0.0',
          description: pkg.description ?? '',
          installed: true
        })
      } catch {
        // skip unreadable/unparseable entries
      }
    }
    return plugins
  }

  search(query: string): Promise<PluginSearchResult[]> {
    const q = `keywords:kode-plugin${query ? '+' + encodeURIComponent(query) : ''}`
    const url = `https://registry.npmjs.org/-/v1/search?text=${q}&size=20`

    return new Promise(resolve => {
      const req = this.httpGet(url, res => {
        let raw = ''
        res.on('data', (chunk: unknown) => { raw += String(chunk) })
        res.on('end', () => {
          try {
            const data = JSON.parse(raw) as {
              objects: Array<{
                package: { name: string; description?: string; version: string }
                downloads?: { monthly?: number }
              }>
            }
            resolve(
              data.objects.map(obj => ({
                id: obj.package.name,
                name: obj.package.name,
                description: obj.package.description ?? '',
                version: obj.package.version,
                downloads: obj.downloads?.monthly
              }))
            )
          } catch {
            resolve([])
          }
        })
      })
      req.on('error', () => resolve([]))
    })
  }

  async install(id: string): Promise<void> {
    await mkdir(this.pluginsDir, { recursive: true })
    return new Promise((resolve, reject) => {
      this.execFn(NPM_BIN, ['install', id], { cwd: this.pluginsDir }, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  uninstall(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.execFn(NPM_BIN, ['uninstall', id], { cwd: this.pluginsDir }, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
