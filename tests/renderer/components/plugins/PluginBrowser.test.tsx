import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockSetEditorConfig = vi.hoisted(() => vi.fn())
const mockUseSettings = vi.hoisted(() => vi.fn())

vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: mockUseSettings }))

const mockList = vi.fn()
const mockSearch = vi.fn()
const mockInstall = vi.fn()
const mockUninstall = vi.fn()

const DEFAULT_EDITOR = {
  fontSize: 13, tabSize: 2, wordWrap: 'off', minimap: true, lineNumbers: 'on',
  formatOnSave: false, autoSave: false, bracketPairColorization: true, smoothScrolling: true
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSettings.mockReturnValue({
    settings: { editor: DEFAULT_EDITOR },
    setEditorConfig: mockSetEditorConfig
  })
  Object.defineProperty(window, 'kode', {
    value: {
      plugins: {
        list: mockList,
        search: mockSearch,
        install: mockInstall,
        uninstall: mockUninstall
      },
      shell: {
        openExternal: vi.fn().mockResolvedValue(undefined)
      }
    },
    writable: true,
    configurable: true
  })
  mockList.mockResolvedValue([])
  mockSearch.mockResolvedValue([])
  mockInstall.mockResolvedValue(undefined)
  mockUninstall.mockResolvedValue(undefined)
})

import { PluginBrowser } from '../../../../src/renderer/src/components/plugins/PluginBrowser'

describe('PluginBrowser', () => {
  it('renders the panel title', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('Extensions')).toBeTruthy()
  })

  it('shows installed plugins on load', async () => {
    mockList.mockResolvedValue([
      { id: 'kode-plugin-git', name: 'kode-plugin-git', version: '1.0.0', description: 'Git tools', installed: true }
    ])
    render(<PluginBrowser />)
    await waitFor(() => {
      expect(screen.getByText('kode-plugin-git')).toBeTruthy()
    })
  })

  it('shows Uninstall button for installed plugins', async () => {
    mockList.mockResolvedValue([
      { id: 'kode-plugin-git', name: 'kode-plugin-git', version: '1.0.0', description: '', installed: true }
    ])
    render(<PluginBrowser />)
    await waitFor(() => {
      expect(screen.getByText('Uninstall')).toBeTruthy()
    })
  })

  it('calls uninstall and refreshes on Uninstall click', async () => {
    mockList.mockResolvedValue([
      { id: 'kode-plugin-git', name: 'kode-plugin-git', version: '1.0.0', description: '', installed: true }
    ])
    render(<PluginBrowser />)
    await waitFor(() => screen.getByText('Uninstall'))
    fireEvent.click(screen.getByText('Uninstall'))
    await waitFor(() => {
      expect(mockUninstall).toHaveBeenCalledWith('kode-plugin-git')
      expect(mockList).toHaveBeenCalledTimes(2) // initial + after uninstall
    })
  })

  it('shows empty state message when no plugins installed', async () => {
    mockList.mockResolvedValue([])
    render(<PluginBrowser />)
    await waitFor(() => {
      expect(screen.getByText(/No npm plugins installed/i)).toBeTruthy()
    })
  })

  it('has a search input', () => {
    render(<PluginBrowser />)
    expect(screen.getByPlaceholderText(/Search marketplace/i)).toBeTruthy()
  })

  it('calls search when input changes', async () => {
    mockSearch.mockResolvedValue([])
    render(<PluginBrowser />)
    const input = screen.getByPlaceholderText(/Search marketplace/i)
    fireEvent.change(input, { target: { value: 'git' } })
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('git')
    })
  })

  it('shows search results with Install button', async () => {
    mockSearch.mockResolvedValue([
      { id: 'kode-plugin-eslint', name: 'kode-plugin-eslint', description: 'ESLint', version: '2.0.0' }
    ])
    render(<PluginBrowser />)
    const input = screen.getByPlaceholderText(/Search marketplace/i)
    fireEvent.change(input, { target: { value: 'eslint' } })
    await waitFor(() => {
      expect(screen.getByText('kode-plugin-eslint')).toBeTruthy()
      expect(screen.getByText('Install')).toBeTruthy()
    })
  })

  it('calls install and refreshes on Install click', async () => {
    mockSearch.mockResolvedValue([
      { id: 'kode-plugin-eslint', name: 'kode-plugin-eslint', description: 'ESLint', version: '2.0.0' }
    ])
    render(<PluginBrowser />)
    fireEvent.change(screen.getByPlaceholderText(/Search marketplace/i), { target: { value: 'eslint' } })
    await waitFor(() => screen.getByText('Install'))
    fireEvent.click(screen.getByText('Install'))
    await waitFor(() => {
      expect(mockInstall).toHaveBeenCalledWith('kode-plugin-eslint')
      expect(mockList).toHaveBeenCalledTimes(2) // initial + after install
    })
  })

  it('shows loading state during install', async () => {
    let resolve: () => void
    mockInstall.mockReturnValue(new Promise<void>(r => { resolve = r }))
    mockSearch.mockResolvedValue([
      { id: 'kode-plugin-x', name: 'kode-plugin-x', description: '', version: '1.0.0' }
    ])
    render(<PluginBrowser />)
    fireEvent.change(screen.getByPlaceholderText(/Search marketplace/i), { target: { value: 'x' } })
    await waitFor(() => screen.getByText('Install'))
    fireEvent.click(screen.getByText('Install'))
    await waitFor(() => {
      expect(screen.queryByText('Installing...')).toBeTruthy()
    })
    resolve!()
  })

  it('shows Built-in section with Format on Save toggle', async () => {
    render(<PluginBrowser />)
    await waitFor(() => {
      expect(screen.getByText('Format on Save')).toBeTruthy()
    })
  })

  it('shows Recommended section', async () => {
    render(<PluginBrowser />)
    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeTruthy()
      expect(screen.getByText('Prettier – Code formatter')).toBeTruthy()
    })
  })

  it('calls setEditorConfig when a built-in toggle is clicked', async () => {
    render(<PluginBrowser />)
    await waitFor(() => screen.getByText('Format on Save'))
    const toggle = screen.getAllByRole('switch')[0]
    fireEvent.click(toggle)
    expect(mockSetEditorConfig).toHaveBeenCalledWith(
      expect.objectContaining({ formatOnSave: true })
    )
  })
})
