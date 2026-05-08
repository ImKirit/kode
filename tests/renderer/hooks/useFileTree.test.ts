import { renderHook, act } from '@testing-library/react'
import { useFileTree } from '@renderer/hooks/useFileTree'
import type { FileEntry } from '@renderer/types'

const mockKode = {
  platform: 'win32',
  fs: { readDir: vi.fn(), readFile: vi.fn(), writeFile: vi.fn(), openFolder: vi.fn() },
  setTitle: vi.fn()
}
Object.defineProperty(window, 'kode', { value: mockKode, writable: true })

const ENTRIES: FileEntry[] = [
  { name: 'src', path: '/proj/src', type: 'directory' },
  { name: 'README.md', path: '/proj/README.md', type: 'file' }
]

describe('useFileTree', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads root entries for a given path', async () => {
    mockKode.fs.readDir.mockResolvedValue(ENTRIES)
    const { result } = renderHook(() => useFileTree('/proj'))
    await act(async () => {})
    expect(result.current.entries).toEqual(ENTRIES)
  })

  it('toggleExpanded marks a directory as expanded and loads children', async () => {
    mockKode.fs.readDir.mockResolvedValueOnce(ENTRIES)
    const children: FileEntry[] = [{ name: 'index.ts', path: '/proj/src/index.ts', type: 'file' }]
    mockKode.fs.readDir.mockResolvedValueOnce(children)

    const { result } = renderHook(() => useFileTree('/proj'))
    await act(async () => {})
    await act(() => result.current.toggleExpanded('/proj/src'))

    expect(result.current.expanded.has('/proj/src')).toBe(true)
    expect(result.current.children['/proj/src']).toEqual(children)
  })

  it('toggleExpanded collapses an already-expanded directory', async () => {
    mockKode.fs.readDir
      .mockResolvedValueOnce(ENTRIES)
      .mockResolvedValueOnce([])
    const { result } = renderHook(() => useFileTree('/proj'))
    await act(async () => {})
    await act(() => result.current.toggleExpanded('/proj/src'))
    await act(() => result.current.toggleExpanded('/proj/src'))
    expect(result.current.expanded.has('/proj/src')).toBe(false)
  })
})
