import { ipcMain, BrowserWindow } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { loadSettings } from './settings'
import { mcpManager } from '../mcp/McpManager'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

let currentStream: ReturnType<Anthropic['messages']['stream']> | null = null
let openaiAbortController: AbortController | null = null
let registered = false

// Module-level map for pending tool approvals in Ask mode
const pendingApprovals = new Map<string, (approved: boolean) => void>()

export function _resetRegistered(): void {
  registered = false
}

export function registerAiHandlers(): void {
  if (registered) return
  registered = true

  // One-shot approval responses from renderer
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

      // Build tools from McpManager
      const mcpTools = mcpManager.listTools()
      const tools: Anthropic.Tool[] = mcpTools.map(t => ({
        name: `${t.serverId}__${t.name}`,
        description: `[${t.serverId}] ${t.description}`,
        input_schema: t.inputSchema as Anthropic.Tool['input_schema']
      }))

      // HTTP servers — Anthropic handles these server-side
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
          // Attach mcp_servers if any (cast needed — SDK may not have this type yet)
          if (httpServers.length > 0) {
            streamParams['mcp_servers'] = httpServers
          }

          const stream = client.messages.stream(streamParams as Parameters<typeof client.messages.stream>[0])
          currentStream = stream

          stream.on('text', (text: string) => send('ai:token', text))

          stream.finalMessage()
            .then(msg => {
              currentStream = null
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
            // Parse server and tool name from namespaced name: "serverId__toolName"
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
              toolResults.push({
                type: 'tool_result',
                tool_use_id: callId,
                content: 'Denied by user',
                is_error: true
              })
              continue
            }

            send('ai:toolCall', { callId, toolName, serverId, args })
            const result = await mcpManager.callTool(serverId, toolName, args)
            send('ai:toolResult', { callId, result: result.content, isError: result.isError })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: callId,
              content: result.content,
              is_error: result.isError
            })
          }

          // Append assistant turn + tool results, loop
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
    // Reject all pending approvals
    for (const [, resolve] of pendingApprovals) resolve(false)
    pendingApprovals.clear()
  })
}
