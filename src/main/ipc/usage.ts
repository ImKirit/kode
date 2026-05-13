import { ipcMain, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

let registered = false

export interface UsageStats {
  today: number
  week: number
  allTime: number
  byDay: Record<string, number>
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function usagePath(): string {
  return join(app.getPath('userData'), 'usage.json')
}

export async function readUsageData(): Promise<Record<string, number>> {
  try {
    const raw = await readFile(usagePath(), 'utf-8')
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

async function writeUsageData(data: Record<string, number>): Promise<void> {
  await writeFile(usagePath(), JSON.stringify(data), 'utf-8')
}

export function computeStats(data: Record<string, number>): UsageStats {
  const today = data[todayKey()] ?? 0
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return data[d.toISOString().slice(0, 10)] ?? 0
  }).reduce((a, b) => a + b, 0)
  const allTime = Object.values(data).reduce((a, b) => a + b, 0)
  return { today, week, allTime, byDay: data }
}

export function _resetRegistered(): void {
  registered = false
}

export function registerUsageHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('usage:add', async (_event, count: number) => {
    const data = await readUsageData()
    const key = todayKey()
    data[key] = (data[key] ?? 0) + Math.max(0, count)
    // Prune to last 31 days
    const sorted = Object.keys(data).sort()
    for (const k of sorted.slice(0, Math.max(0, sorted.length - 31))) {
      delete data[k]
    }
    await writeUsageData(data)
  })

  ipcMain.handle('usage:getStats', async (): Promise<UsageStats> => {
    const data = await readUsageData()
    return computeStats(data)
  })
}
