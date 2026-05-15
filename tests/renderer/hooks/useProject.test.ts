import { renderHook, act } from '@testing-library/react'
import { useProject } from '@renderer/hooks/useProject'

const mockKode = {
  platform: 'win32',
  fs: {
    openFolder: vi.fn(),
    readDir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn()
  },
  setTitle: vi.fn()
}
Object.defineProperty(window, 'kode', { value: mockKode, writable: true })

describe('useProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts with no project open', () => {
    const { result } = renderHook(() => useProject())
    expect(result.current.project.rootPath).toBeNull()
    expect(result.current.openFiles).toHaveLength(0)
  })

  it('openFolder sets rootPath when user picks a folder', async () => {
    mockKode.fs.openFolder.mockResolvedValue('/home/user/myproject')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFolder())
    expect(result.current.project.rootPath).toBe('/home/user/myproject')
    expect(result.current.project.name).toBe('myproject')
  })

  it('openFolder does nothing when user cancels', async () => {
    mockKode.fs.openFolder.mockResolvedValue(null)
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFolder())
    expect(result.current.project.rootPath).toBeNull()
  })

  it('openFile adds file to openFiles list', async () => {
    mockKode.fs.readFile.mockResolvedValue('const x = 1')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/index.ts'))
    expect(result.current.openFiles).toHaveLength(1)
    expect(result.current.openFiles[0].path).toBe('/proj/index.ts')
    expect(result.current.activeFilePath).toBe('/proj/index.ts')
  })

  it('opening same file twice does not duplicate it', async () => {
    mockKode.fs.readFile.mockResolvedValue('x')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/index.ts'))
    await act(() => result.current.openFile('/proj/index.ts'))
    expect(result.current.openFiles).toHaveLength(1)
  })

  it('saveFile writes content and clears dirty flag', async () => {
    mockKode.fs.readFile.mockResolvedValue('original')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/index.ts'))
    act(() => result.current.updateFileContent('/proj/index.ts', 'modified'))
    expect(result.current.openFiles[0].dirty).toBe(true)
    await act(() => result.current.saveFile('/proj/index.ts'))
    expect(mockKode.fs.writeFile).toHaveBeenCalledWith('/proj/index.ts', 'modified')
    expect(result.current.openFiles[0].dirty).toBe(false)
  })

  it('closeFile removes it and sets previous file as active', async () => {
    mockKode.fs.readFile.mockResolvedValue('')
    const { result } = renderHook(() => useProject())
    await act(() => result.current.openFile('/proj/a.ts'))
    await act(() => result.current.openFile('/proj/b.ts'))
    act(() => result.current.closeFile('/proj/b.ts'))
    expect(result.current.openFiles).toHaveLength(1)
    expect(result.current.activeFilePath).toBe('/proj/a.ts')
  })
})
