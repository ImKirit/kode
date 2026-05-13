import { ipcMain, app, safeStorage } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
  publicRepos: number
}

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  private: boolean
  cloneUrl: string
  htmlUrl: string
  description: string | null
  updatedAt: string
}

export interface FolderRepo {
  owner: string
  repo: string
  fullName: string
  cloneUrl: string
  private: boolean
}

function tokenPath(): string {
  return path.join(app.getPath('userData'), 'github-token.enc')
}

function linksPath(): string {
  return path.join(app.getPath('userData'), 'github-links.json')
}

function encryptToken(token: string): string {
  if (!token || !safeStorage.isEncryptionAvailable()) return token
  return safeStorage.encryptString(token).toString('base64')
}

function decryptToken(encrypted: string): string {
  if (!encrypted || !safeStorage.isEncryptionAvailable()) return encrypted
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return ''
  }
}

export function getStoredGithubToken(): string {
  const p = tokenPath()
  if (!fs.existsSync(p)) return ''
  try {
    return decryptToken(fs.readFileSync(p, 'utf8').trim())
  } catch {
    return ''
  }
}

function storeToken(token: string): void {
  fs.writeFileSync(tokenPath(), encryptToken(token), 'utf8')
}

function getLinks(): Record<string, FolderRepo> {
  const p = linksPath()
  if (!fs.existsSync(p)) return {}
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return {}
  }
}

function saveLinks(links: Record<string, FolderRepo>): void {
  fs.writeFileSync(linksPath(), JSON.stringify(links, null, 2), 'utf8')
}

async function ghFetch(token: string, endpoint: string, options?: RequestInit) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string }
    throw new Error(err.message ?? `GitHub API error: ${res.status}`)
  }
  return res.json()
}

function mapRepo(r: Record<string, unknown>): GitHubRepo {
  return {
    id: r.id as number,
    name: r.name as string,
    fullName: r.full_name as string,
    private: r.private as boolean,
    cloneUrl: r.clone_url as string,
    htmlUrl: r.html_url as string,
    description: (r.description as string | null) ?? null,
    updatedAt: r.updated_at as string
  }
}

let registered = false

export function _resetGithubRegistered(): void {
  registered = false
}

export function registerGithubHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('github:hasToken', (): boolean => !!getStoredGithubToken())

  ipcMain.handle('github:setToken', (_e, token: string): void => {
    storeToken(token)
  })

  ipcMain.handle('github:clearToken', (): void => {
    const p = tokenPath()
    if (fs.existsSync(p)) fs.unlinkSync(p)
  })

  ipcMain.handle('github:validateToken', async (_e, token: string): Promise<{ valid: boolean; user?: GitHubUser; error?: string }> => {
    try {
      const data = await ghFetch(token, '/user') as Record<string, unknown>
      return {
        valid: true,
        user: {
          login: data.login as string,
          name: (data.name as string | null) ?? null,
          avatarUrl: data.avatar_url as string,
          publicRepos: data.public_repos as number
        }
      }
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('github:getUser', async (): Promise<GitHubUser | null> => {
    const token = getStoredGithubToken()
    if (!token) return null
    try {
      const data = await ghFetch(token, '/user') as Record<string, unknown>
      return {
        login: data.login as string,
        name: (data.name as string | null) ?? null,
        avatarUrl: data.avatar_url as string,
        publicRepos: data.public_repos as number
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('github:listRepos', async (): Promise<GitHubRepo[]> => {
    const token = getStoredGithubToken()
    if (!token) throw new Error('Not connected to GitHub')
    const data = await ghFetch(token, '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator') as Record<string, unknown>[]
    return data.map(mapRepo)
  })

  ipcMain.handle('github:createRepo', async (_e, opts: {
    name: string
    description: string
    private: boolean
    autoInit: boolean
    gitignoreTemplate: string | null
    license: string | null
  }): Promise<GitHubRepo> => {
    const token = getStoredGithubToken()
    if (!token) throw new Error('Not connected to GitHub')
    const body: Record<string, unknown> = {
      name: opts.name,
      description: opts.description,
      private: opts.private,
      auto_init: opts.autoInit
    }
    if (opts.gitignoreTemplate) body.gitignore_template = opts.gitignoreTemplate
    if (opts.license) body.license_template = opts.license
    const data = await ghFetch(token, '/user/repos', { method: 'POST', body: JSON.stringify(body) }) as Record<string, unknown>
    return mapRepo(data)
  })

  ipcMain.handle('github:getGitignoreTemplates', async (): Promise<string[]> => {
    try {
      const res = await fetch('https://api.github.com/gitignore/templates', {
        headers: { Accept: 'application/vnd.github.v3+json' }
      })
      return await res.json() as string[]
    } catch {
      return ['Node', 'Python', 'Go', 'Rust', 'Java', 'C', 'C++', 'Swift', 'Kotlin']
    }
  })

  ipcMain.handle('github:getLinkedRepo', (_e, folderPath: string): FolderRepo | null => {
    return getLinks()[folderPath] ?? null
  })

  ipcMain.handle('github:setLinkedRepo', (_e, folderPath: string, repo: FolderRepo): void => {
    const links = getLinks()
    links[folderPath] = repo
    saveLinks(links)
  })

  ipcMain.handle('github:unlinkRepo', (_e, folderPath: string): void => {
    const links = getLinks()
    delete links[folderPath]
    saveLinks(links)
  })
}
