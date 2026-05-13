import { ipcMain, app, safeStorage } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

let registered = false

export interface AuthSession {
  email: string
  name?: string
  plan?: string
}

export interface AuthResult {
  ok: boolean
  error?: string
  email?: string
  name?: string
  plan?: string
}

function tokenPath(): string {
  return join(app.getPath('userData'), 'auth-token.enc')
}

function sessionPath(): string {
  return join(app.getPath('userData'), 'auth-session.json')
}

export async function readAuthToken(): Promise<string | null> {
  try {
    const enc = await readFile(tokenPath())
    if (!enc.length) return null
    return safeStorage.decryptString(enc)
  } catch {
    return null
  }
}

async function saveAuthToken(token: string): Promise<void> {
  const enc = safeStorage.encryptString(token)
  await writeFile(tokenPath(), enc)
}

async function clearAuthToken(): Promise<void> {
  await writeFile(tokenPath(), Buffer.alloc(0))
  await writeFile(sessionPath(), '{}', 'utf-8')
}

async function readSession(): Promise<AuthSession | null> {
  try {
    const raw = await readFile(sessionPath(), 'utf-8')
    const data = JSON.parse(raw) as Partial<AuthSession>
    if (!data.email) return null
    return data as AuthSession
  } catch {
    return null
  }
}

async function saveSession(session: AuthSession): Promise<void> {
  await writeFile(sessionPath(), JSON.stringify(session), 'utf-8')
}

function backendUrl(): string {
  return process.env.KODE_BACKEND_URL ?? 'https://api.kode.dev'
}

async function callBackend(path: string, body: object): Promise<AuthResult> {
  try {
    const res = await fetch(`${backendUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    })
    const data = await res.json() as { token?: string; email?: string; name?: string; plan?: string; message?: string }
    if (!res.ok || !data.token) {
      return { ok: false, error: data.message ?? `Server error ${res.status}` }
    }
    await saveAuthToken(data.token)
    const session: AuthSession = { email: data.email ?? '', name: data.name, plan: data.plan }
    await saveSession(session)
    return { ok: true, ...session }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('Failed')) {
      return { ok: false, error: 'Cannot reach Kode account server. Check your internet connection.' }
    }
    return { ok: false, error: 'Login failed. Please try again.' }
  }
}

export function _resetRegistered(): void {
  registered = false
}

export function registerAuthHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('auth:getSession', async (): Promise<(AuthSession & { token: string }) | null> => {
    const token = await readAuthToken()
    if (!token) return null
    const session = await readSession()
    if (!session) return null
    return { token, ...session }
  })

  ipcMain.handle('auth:login', async (_event, email: string, password: string): Promise<AuthResult> => {
    return callBackend('/auth/login', { email, password })
  })

  ipcMain.handle('auth:signup', async (_event, email: string, password: string): Promise<AuthResult> => {
    return callBackend('/auth/signup', { email, password })
  })

  ipcMain.handle('auth:logout', async (): Promise<void> => {
    await clearAuthToken()
  })

  ipcMain.handle('auth:getToken', async (): Promise<string | null> => {
    return readAuthToken()
  })
}
