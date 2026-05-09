import { ipcMain, BrowserWindow } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { loadSettings } from './settings'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

let currentStream: ReturnType<Anthropic['messages']['stream']> | null = null
let openaiAbortController: AbortController | null = null
let registered = false

export function _resetRegistered(): void {
  registered = false
}

export function registerAiHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('ai:sendMessage', async (event, messages: ChatMessage[]) => {
    currentStream?.abort()
    currentStream = null
    openaiAbortController?.abort()
    openaiAbortController = null

    const settings = loadSettings()
    const provider = settings.activeProvider
    const { apiKey, model } = settings.providers[provider]

    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (channel: string, ...args: unknown[]): void => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
    }

    if (!apiKey.trim()) {
      send('ai:error', `No API key configured for ${provider}. Open settings to add one.`)
      return
    }

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })
      const stream = client.messages.stream({ model, max_tokens: 8192, messages })
      currentStream = stream

      stream.on('text', (text: string) => send('ai:token', text))

      return stream.finalMessage()
        .then(() => { currentStream = null; send('ai:done') })
        .catch((err: unknown) => {
          currentStream = null
          if (err instanceof Error && err.name === 'AbortError') {
            send('ai:done')
          } else if ((err as { status?: number }).status === 429) {
            const retryAfter = (err as { headers?: Record<string, string> }).headers?.['retry-after']
            send('ai:rateLimit', retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000)
          } else {
            send('ai:error', err instanceof Error ? err.message : String(err))
          }
        })
    }

    else if (provider === 'openai') {
      const client = new OpenAI({ apiKey })
      openaiAbortController = new AbortController()
      try {
        const stream = await client.chat.completions.create({
          model,
          messages,
          stream: true
        }, { signal: openaiAbortController.signal })
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) send('ai:token', text)
        }
        openaiAbortController = null
        send('ai:done')
      } catch (err: unknown) {
        openaiAbortController = null
        if (err instanceof Error && err.name === 'AbortError') {
          send('ai:done')
        } else if ((err as { status?: number }).status === 429) {
          const retryAfter = (err as { headers?: Record<string, string> }).headers?.['retry-after']
          send('ai:rateLimit', retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000)
        } else {
          send('ai:error', err instanceof Error ? err.message : String(err))
        }
      }
    } else {
      send('ai:error', `Unknown provider: ${provider}`)
    }
  })

  ipcMain.on('ai:stop', () => {
    currentStream?.abort()
    currentStream = null
    openaiAbortController?.abort()
    openaiAbortController = null
  })
}
