import { ipcMain, BrowserWindow } from 'electron'
import Anthropic from '@anthropic-ai/sdk'

type AnthropicMessage = { role: 'user' | 'assistant'; content: string }

let currentStream: ReturnType<Anthropic['messages']['stream']> | null = null
let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function registerAiHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('ai:sendMessage', (event, messages: AnthropicMessage[], apiKey: string) => {
    currentStream?.abort()
    currentStream = null

    const client = new Anthropic({ apiKey })
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      messages
    })
    currentStream = stream

    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (channel: string, ...args: unknown[]): void => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
    }

    stream.on('text', (text: string) => send('ai:token', text))

    stream.finalMessage()
      .then(() => { currentStream = null; send('ai:done') })
      .catch((err: Error) => { currentStream = null; send('ai:error', err.message) })
  })

  ipcMain.on('ai:stop', () => {
    currentStream?.abort()
    currentStream = null
  })
}
