import { ipcMain, app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { spawn } from 'node:child_process'

export interface DeployConfig {
  ip: string
  user: string
  keyPath: string
  workDir: string
}

function configPath(): string {
  return path.join(app.getPath('userData'), 'deploy-config.json')
}

export function loadDeployConfig(): DeployConfig | null {
  const p = configPath()
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as DeployConfig
  } catch {
    return null
  }
}

function saveConfig(config: DeployConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8')
}

// On Windows use the built-in OpenSSH client to avoid WSL's ssh intercepting the call
const SSH_BIN = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\OpenSSH\\ssh.exe'
  : 'ssh'

function checkSshAvailable(): { ok: boolean; error?: string } {
  if (process.platform === 'win32' && !fs.existsSync(SSH_BIN)) {
    return {
      ok: false,
      error: [
        'OpenSSH client not found on this system.',
        'Enable it via: Settings → Apps → Optional features → Add a feature → OpenSSH Client',
        '',
        `Expected path: ${SSH_BIN}`
      ].join('\n')
    }
  }
  return { ok: true }
}

function spawnSsh(
  config: DeployConfig,
  command: string,
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string }> {
  const ssh = checkSshAvailable()
  if (!ssh.ok) return Promise.reject(new Error(ssh.error))

  const keyArgs = config.keyPath ? ['-i', config.keyPath] : []
  const args = [
    ...keyArgs,
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=15',
    '-o', 'StrictHostKeyChecking=accept-new',
    `${config.user}@${config.ip}`,
    command
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn(SSH_BIN, args)
    const timer = setTimeout(() => { proc.kill(); reject(new Error('SSH command timed out')) }, timeoutMs)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', code => {
      clearTimeout(timer)
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(stderr.trim() || stdout.trim() || `SSH exited with code ${code}`))
    })
    proc.on('error', e => { clearTimeout(timer); reject(e) })
  })
}

let registered = false

export function _resetDeployRegistered(): void {
  registered = false
}

export function registerDeployHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('deploy:getConfig', (): DeployConfig | null => loadDeployConfig())

  ipcMain.handle('deploy:setConfig', (_e, config: DeployConfig): void => {
    saveConfig(config)
  })

  ipcMain.handle('deploy:testConnection', async (): Promise<{ ok: boolean; error?: string; info?: string }> => {
    const config = loadDeployConfig()
    if (!config?.ip) return { ok: false, error: 'No SSH configuration saved' }
    try {
      const { stdout } = await spawnSsh(config, 'echo OK && uname -a && node --version 2>/dev/null || echo node-not-installed')
      return { ok: true, info: stdout.trim() }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('deploy:setup', async (): Promise<{ ok: boolean; output?: string; error?: string }> => {
    const config = loadDeployConfig()
    if (!config?.ip) return { ok: false, error: 'No SSH configuration saved' }
    const script = [
      'export DEBIAN_FRONTEND=noninteractive',
      'apt-get update -qq 2>/dev/null || true',
      'which curl || apt-get install -y -qq curl',
      'which git || apt-get install -y -qq git',
      'which node || (curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y -qq nodejs)',
      `mkdir -p ${config.workDir || '~/kode-deploy'}`,
      'echo "=== Setup complete ==="',
      'echo "Node: $(node --version 2>/dev/null || echo not installed)"',
      'echo "Git: $(git --version)"'
    ].join(' && ')
    try {
      const { stdout, stderr } = await spawnSsh(config, `bash -c '${script}'`, 180000)
      return { ok: true, output: (stdout + (stderr ? '\n' + stderr : '')).trim() }
    } catch (e: unknown) {
      const err = e as { message?: string; stdout?: string }
      return { ok: false, error: err.message ?? String(e), output: err.stdout }
    }
  })

  ipcMain.handle('deploy:execute', async (_e, command: string): Promise<{ ok: boolean; output?: string; error?: string }> => {
    const config = loadDeployConfig()
    if (!config?.ip) return { ok: false, error: 'No SSH configuration saved' }
    const workDir = config.workDir || '~/kode-deploy'
    try {
      const { stdout, stderr } = await spawnSsh(config, `cd ${workDir} && ${command}`, 60000)
      return { ok: true, output: (stdout + (stderr ? '\n' + stderr : '')).trim() }
    } catch (e: unknown) {
      const err = e as { message?: string; stdout?: string }
      return { ok: false, error: err.message ?? String(e), output: err.stdout }
    }
  })
}
