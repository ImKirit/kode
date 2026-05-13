import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PluginBrowser } from '../../../../src/renderer/src/components/plugins/PluginBrowser'

const mockList = vi.fn()
const mockSearch = vi.fn()
const mockInstall = vi.fn()
const mockUninstall = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'kode', {
    value: {
      plugins: {
        list: mockList,
        search: mockSearch,
        install: mockInstall,
        uninstall: mockUninstall
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

describe('PluginBrowser', () => {
  it('renders the panel title', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('Plugin Marketplace')).toBeTruthy()
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
      expect(screen.getByText(/No plugins installed/i)).toBeTruthy()
    })
  })

  it('has a search input', () => {
    render(<PluginBrowser />)
    expect(screen.getByPlaceholderText(/Search plugins/i)).toBeTruthy()
  })

  it('calls search when input changes', async () => {
    mockSearch.mockResolvedValue([])
    render(<PluginBrowser />)
    const input = screen.getByPlaceholderText(/Search plugins/i)
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
    const input = screen.getByPlaceholderText(/Search plugins/i)
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
    fireEvent.change(screen.getByPlaceholderText(/Search plugins/i), { target: { value: 'eslint' } })
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
    fireEvent.change(screen.getByPlaceholderText(/Search plugins/i), { target: { value: 'x' } })
    await waitFor(() => screen.getByText('Install'))
    fireEvent.click(screen.getByText('Install'))
    // Button should show loading state
    await waitFor(() => {
      expect(screen.queryByText('Installing...')).toBeTruthy()
    })
    resolve!()
  })
})
