import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcHandle = vi.hoisted(() => vi.fn())
const mockReadFile = vi.hoisted(() => vi.fn())
const mockWriteFile = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockIpcHandle },
  app: { getPath: () => '/tmp/test-usage' }
}))

vi.mock('path', () => ({
  join: (...parts: string[]) => parts.join('/')
}))

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile
}))

function getHandler(channel: string) {
  const call = mockIpcHandle.mock.calls.find(c => c[0] === channel)
  return call?.[1] as ((_event: unknown, ...args: unknown[]) => unknown) | undefined
}

describe('computeStats', () => {
  it('returns zeros for empty data', async () => {
    const { computeStats } = await import('../../../src/main/ipc/usage')
    const stats = computeStats({})
    expect(stats.today).toBe(0)
    expect(stats.week).toBe(0)
    expect(stats.allTime).toBe(0)
  })

  it('counts today correctly', async () => {
    const { computeStats } = await import('../../../src/main/ipc/usage')
    const today = new Date().toISOString().slice(0, 10)
    const stats = computeStats({ [today]: 500 })
    expect(stats.today).toBe(500)
    expect(stats.week).toBe(500)
    expect(stats.allTime).toBe(500)
  })

  it('includes last 7 days in week total, excludes 8th', async () => {
    const { computeStats } = await import('../../../src/main/ipc/usage')
    const data: Record<string, number> = {}
    for (let i = 0; i < 8; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      data[d.toISOString().slice(0, 10)] = 100
    }
    const stats = computeStats(data)
    expect(stats.week).toBe(700)
    expect(stats.allTime).toBe(800)
  })

  it('byDay matches input data', async () => {
    const { computeStats } = await import('../../../src/main/ipc/usage')
    const today = new Date().toISOString().slice(0, 10)
    const data = { [today]: 42 }
    const stats = computeStats(data)
    expect(stats.byDay).toEqual(data)
  })
})

describe('registerUsageHandlers', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockIpcHandle.mockClear()
    mockReadFile.mockReset()
    mockWriteFile.mockReset()
    mockWriteFile.mockResolvedValue(undefined)
  })

  it('registers usage:add and usage:getStats', async () => {
    const { registerUsageHandlers } = await import('../../../src/main/ipc/usage')
    registerUsageHandlers()
    const channels = mockIpcHandle.mock.calls.map(c => c[0])
    expect(channels).toContain('usage:add')
    expect(channels).toContain('usage:getStats')
  })

  it('usage:add writes accumulated tokens for today', async () => {
    mockReadFile.mockResolvedValue('{}')
    const { registerUsageHandlers } = await import('../../../src/main/ipc/usage')
    registerUsageHandlers()
    const handler = getHandler('usage:add')!
    await handler({}, 300)
    expect(mockWriteFile).toHaveBeenCalled()
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    const today = new Date().toISOString().slice(0, 10)
    expect(written[today]).toBe(300)
  })

  it('usage:add accumulates on existing value', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockReadFile.mockResolvedValue(JSON.stringify({ [today]: 1000 }))
    const { registerUsageHandlers } = await import('../../../src/main/ipc/usage')
    registerUsageHandlers()
    const handler = getHandler('usage:add')!
    await handler({}, 500)
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    expect(written[today]).toBe(1500)
  })

  it('usage:getStats returns correct today count', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockReadFile.mockResolvedValue(JSON.stringify({ [today]: 2500 }))
    const { registerUsageHandlers } = await import('../../../src/main/ipc/usage')
    registerUsageHandlers()
    const handler = getHandler('usage:getStats')!
    const stats = await handler({}) as { today: number; week: number; allTime: number }
    expect(stats.today).toBe(2500)
    expect(stats.week).toBe(2500)
    expect(stats.allTime).toBe(2500)
  })

  it('usage:add ignores negative counts', async () => {
    mockReadFile.mockResolvedValue('{}')
    const { registerUsageHandlers } = await import('../../../src/main/ipc/usage')
    registerUsageHandlers()
    const handler = getHandler('usage:add')!
    await handler({}, -100)
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string)
    const today = new Date().toISOString().slice(0, 10)
    expect(written[today]).toBe(0)
  })
})
