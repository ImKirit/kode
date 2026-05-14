import { ipcMain, BrowserWindow, shell } from 'electron'
import * as http from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as net from 'node:net'
import { WebSocketServer, WebSocket } from 'ws'
import chokidar from 'chokidar'

interface ServerState {
  httpServer: http.Server
  wss: WebSocketServer
  watcher: ReturnType<typeof chokidar.watch>
  port: number
  rootPath: string
}

let state: ServerState | null = null
let registered = false

const INJECT_SCRIPT = `
<script>
(function(){
  var ws = new WebSocket('ws://localhost:__PORT__');
  ws.onmessage = function(e){ if(e.data==='reload') location.reload(); };
  ws.onclose = function(){ setTimeout(function(){ location.reload(); }, 2000); };
})();
</script>`

function mime(ext: string): string {
  const map: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm':  'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.mjs':  'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
    '.webp': 'image/webp',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm'
  }
  return map[ext.toLowerCase()] ?? 'application/octet-stream'
}

async function findFreePort(start: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(start, () => {
      const addr = server.address() as net.AddressInfo
      server.close(() => resolve(addr.port))
    })
    server.on('error', () => findFreePort(start + 1).then(resolve).catch(reject))
  })
}

function broadcast(wss: WebSocketServer, msg: string): void {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg)
  }
}

export function _resetLiveServerRegistered(): void {
  registered = false
}

export function registerLiveServerHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('liveserver:start', async (_event, rootPath: string, preferredPort?: number): Promise<{ ok: boolean; port?: number; error?: string }> => {
    if (state) {
      // already running — return current port
      return { ok: true, port: state.port }
    }
    if (!rootPath || !fs.existsSync(rootPath)) {
      return { ok: false, error: 'No project folder open. Open a folder first.' }
    }

    try {
      const port = await findFreePort(preferredPort ?? 5500)

      const httpServer = http.createServer((req, res) => {
        let urlPath = req.url?.split('?')[0] ?? '/'
        if (urlPath === '/') urlPath = '/index.html'
        const filePath = path.join(rootPath, urlPath)

        if (!filePath.startsWith(rootPath)) {
          res.writeHead(403)
          res.end('Forbidden')
          return
        }

        let target = filePath
        if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
          target = path.join(filePath, 'index.html')
        }

        if (!fs.existsSync(target)) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end(`Not found: ${urlPath}`)
          return
        }

        const ext = path.extname(target)
        const isHtml = ext === '.html' || ext === '.htm'
        let content = fs.readFileSync(target)

        if (isHtml) {
          const html = content.toString('utf-8')
          const injected = html.replace(
            '</body>',
            INJECT_SCRIPT.replace('__PORT__', String(port)) + '</body>'
          )
          res.writeHead(200, { 'Content-Type': mime(ext), 'Cache-Control': 'no-cache' })
          res.end(injected)
        } else {
          res.writeHead(200, { 'Content-Type': mime(ext) })
          res.end(content)
        }
      })

      const wss = new WebSocketServer({ server: httpServer })

      const watcher = chokidar.watch(rootPath, {
        ignored: [/(^|[/\\])\../, '**/node_modules/**'],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }
      })

      watcher.on('change', () => {
        broadcast(wss, 'reload')
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) win.webContents.send('liveserver:reload')
      })
      watcher.on('add', () => {
        broadcast(wss, 'reload')
      })

      await new Promise<void>((resolve, reject) => {
        httpServer.listen(port, '127.0.0.1', () => resolve())
        httpServer.on('error', reject)
      })

      state = { httpServer, wss, watcher, port, rootPath }
      shell.openExternal(`http://localhost:${port}`)
      return { ok: true, port }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('liveserver:stop', async (): Promise<void> => {
    if (!state) return
    const s = state
    state = null
    await s.watcher.close()
    s.wss.close()
    await new Promise<void>(resolve => s.httpServer.close(() => resolve()))
  })

  ipcMain.handle('liveserver:status', (): { running: boolean; port?: number; rootPath?: string } => {
    if (!state) return { running: false }
    return { running: true, port: state.port, rootPath: state.rootPath }
  })
}
