import { ipcMain, BrowserWindow } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { loadSettings } from './settings'
import { mcpManager } from '../mcp/McpManager'
import { readAuthToken } from './auth'
import { getStoredGithubToken } from './github'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

let currentStream: ReturnType<Anthropic['messages']['stream']> | null = null
let openaiAbortController: AbortController | null = null
let registered = false

const pendingApprovals = new Map<string, (approved: boolean) => void>()

function backendUrl(): string {
  return process.env.KODE_BACKEND_URL ?? 'https://api.kode.dev'
}

export function _resetRegistered(): void {
  registered = false
}

export function registerAiHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.on('ai:approveTool', (_event, callId: string) => {
    pendingApprovals.get(callId)?.(true)
    pendingApprovals.delete(callId)
  })
  ipcMain.on('ai:denyTool', (_event, callId: string) => {
    pendingApprovals.get(callId)?.(false)
    pendingApprovals.delete(callId)
  })

  ipcMain.handle('ai:sendMessage', async (event, messages: ChatMessage[], systemPrompt?: string) => {
    currentStream?.abort()
    currentStream = null
    openaiAbortController?.abort()
    openaiAbortController = null

    const settings = loadSettings()
    const provider = settings.activeProvider

    const win = BrowserWindow.fromWebContents(event.sender)
    const send = (channel: string, ...args: unknown[]): void => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, ...args)
    }

    // ── Kode Subscription ──────────────────────────────────────────────────
    if (provider === 'kode') {
      const token = await readAuthToken()
      if (!token) {
        send('ai:error', 'Sign in to your Kode account to use Kode AI. Open Settings > Account.')
        return
      }
      const model = settings.providers.kode?.model ?? 'claude-sonnet-4-6'
      openaiAbortController = new AbortController()
      try {
        const res = await fetch(`${backendUrl()}/ai/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ messages, systemPrompt, model }),
          signal: openaiAbortController.signal
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: `Server error ${res.status}` })) as { message?: string }
          if (res.status === 402) {
            send('ai:error', 'Your Kode subscription has reached its limit. Upgrade in Settings > Account.')
          } else if (res.status === 429) {
            send('ai:rateLimit', 60000)
          } else {
            send('ai:error', err.message ?? `Backend error ${res.status}`)
          }
          return
        }
        const reader = res.body?.getReader()
        if (!reader) { send('ai:done'); return }
        const dec = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = dec.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') break
              try {
                const obj = JSON.parse(data) as { token?: string; usage?: { inputTokens: number; outputTokens: number } }
                if (obj.token) send('ai:token', obj.token)
                if (obj.usage) send('ai:usage', obj.usage)
              } catch { /* ignore parse errors */ }
            }
          }
        }
        openaiAbortController = null
        send('ai:done')
      } catch (err) {
        openaiAbortController = null
        if (err instanceof Error && err.name === 'AbortError') {
          send('ai:done')
        } else {
          send('ai:error', err instanceof Error ? err.message : String(err))
        }
      }
      return
    }

    // ── GitHub Copilot ─────────────────────────────────────────────────────
    if (provider === 'copilot') {
      const githubToken = getStoredGithubToken()
      if (!githubToken) {
        send('ai:error', 'Sign in with GitHub to use Copilot. Open Settings > Account.')
        return
      }
      const model = settings.providers.copilot?.model ?? 'gpt-4o'
      openaiAbortController = new AbortController()
      try {
        // Get a Copilot token from GitHub's auth endpoint
        const tokenRes = await fetch('https://api.github.com/copilot_internal/v2/token', {
          headers: {
            Authorization: `token ${githubToken}`,
            'Editor-Version': 'Kode/1.0',
            'Editor-Plugin-Version': 'kode-ai/1.0'
          }
        })
        if (!tokenRes.ok) {
          if (tokenRes.status === 401) {
            send('ai:error', 'GitHub token expired or lacks Copilot scope. Re-authenticate in Settings > Account.')
          } else if (tokenRes.status === 403) {
            send('ai:error', 'GitHub Copilot subscription required. Subscribe at github.com/features/copilot.')
          } else {
            send('ai:error', `GitHub Copilot auth failed (${tokenRes.status}).`)
          }
          return
        }
        const { token: copilotToken } = await tokenRes.json() as { token: string }

        const client = new OpenAI({
          apiKey: copilotToken,
          baseURL: 'https://api.githubcopilot.com'
        })
        openaiAbortController = new AbortController()
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
      } catch (err) {
        openaiAbortController = null
        if (err instanceof Error && err.name === 'AbortError') {
          send('ai:done')
        } else if ((err as { status?: number }).status === 429) {
          send('ai:rateLimit', 60000)
        } else {
          send('ai:error', err instanceof Error ? err.message : String(err))
        }
      }
      return
    }

    // ── Anthropic / OpenAI (direct API key) ────────────────────────────────
    const { apiKey, model } = settings.providers[provider] ?? { apiKey: '', model: '' }

    if (!apiKey.trim()) {
      send('ai:error', `No API key configured for ${provider}. Open Settings to add one, or sign in with your Kode account.`)
      return
    }

    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })

      const mcpTools = mcpManager.listTools()
      const tools: Anthropic.Tool[] = mcpTools.map(t => ({
        name: `${t.serverId}__${t.name}`,
        description: `[${t.serverId}] ${t.description}`,
        input_schema: t.inputSchema as Anthropic.Tool['input_schema']
      }))

      const httpServers = (settings.mcpServers ?? [])
        .filter(s => s.type === 'http' && s.url)
        .map(s => ({ type: 'url' as const, url: s.url! }))

      let currentMessages: ChatMessage[] = [...messages]

      const runStream = async (): Promise<{ stopReason: string; assistantContent: Anthropic.ContentBlock[] }> => {
        return new Promise((resolve, reject) => {
          const streamParams: Record<string, unknown> = {
            model,
            max_tokens: 8192,
            messages: currentMessages,
            ...(systemPrompt ? { system: systemPrompt } : {}),
            ...(tools.length > 0 ? { tools } : {}),
          }
          if (httpServers.length > 0) {
            streamParams['mcp_servers'] = httpServers
          }

          const stream = client.messages.stream(streamParams as Parameters<typeof client.messages.stream>[0])
          currentStream = stream

          stream.on('text', (text: string) => send('ai:token', text))

          stream.finalMessage()
            .then(msg => {
              currentStream = null
              if (msg.usage) {
                send('ai:usage', { inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens })
              }
              resolve({ stopReason: msg.stop_reason ?? 'end_turn', assistantContent: msg.content })
            })
            .catch((err: unknown) => {
              currentStream = null
              reject(err)
            })
        })
      }

      try {
        let { stopReason, assistantContent } = await runStream()

        while (stopReason === 'tool_use') {
          const toolUseBlocks = assistantContent.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          )

          const toolResults: Array<{
            type: 'tool_result'
            tool_use_id: string
            content: string
            is_error: boolean
          }> = []

          for (const block of toolUseBlocks) {
            const callId = block.id
            const doubleUnderIdx = block.name.indexOf('__')
            const serverId = doubleUnderIdx >= 0 ? block.name.slice(0, doubleUnderIdx) : block.name
            const toolName = doubleUnderIdx >= 0 ? block.name.slice(doubleUnderIdx + 2) : block.name
            const args = block.input as Record<string, unknown>

            let approved = true
            if ((settings.mcpPermission ?? 'full') === 'ask') {
              send('ai:toolApproval', { callId, toolName, serverId, args })
              approved = await new Promise<boolean>(resolve => {
                pendingApprovals.set(callId, resolve)
              })
            }

            if (!approved) {
              send('ai:toolResult', { callId, result: 'Tool call denied by user', isError: true })
              toolResults.push({ type: 'tool_result', tool_use_id: callId, content: 'Denied by user', is_error: true })
              continue
            }

            send('ai:toolCall', { callId, toolName, serverId, args })
            const result = await mcpManager.callTool(serverId, toolName, args)
            send('ai:toolResult', { callId, result: result.content, isError: result.isError })
            toolResults.push({ type: 'tool_result', tool_use_id: callId, content: result.content, is_error: result.isError })
          }

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: assistantContent } as unknown as ChatMessage,
            { role: 'user', content: toolResults } as unknown as ChatMessage
          ]

          const next = await runStream()
          stopReason = next.stopReason
          assistantContent = next.assistantContent
        }

        send('ai:done')
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          send('ai:done')
        } else if ((err as { status?: number }).status === 429) {
          const raw = (err as { headers?: { get?(k: string): string | null } }).headers?.get?.('retry-after')
          const parsed = raw ? parseInt(raw, 10) * 1000 : NaN
          send('ai:rateLimit', Number.isFinite(parsed) && parsed > 0 ? parsed : 60000)
        } else {
          send('ai:error', err instanceof Error ? err.message : String(err))
        }
      }
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
          const raw = (err as { headers?: { get?(k: string): string | null } }).headers?.get?.('retry-after')
          const parsed = raw ? parseInt(raw, 10) * 1000 : NaN
          send('ai:rateLimit', Number.isFinite(parsed) && parsed > 0 ? parsed : 60000)
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
    for (const [, resolve] of pendingApprovals) resolve(false)
    pendingApprovals.clear()
  })
}
