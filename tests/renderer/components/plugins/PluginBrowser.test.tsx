import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockUpdateSettings = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUseSettings = vi.hoisted(() => vi.fn())

vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: mockUseSettings }))

const DEFAULT_EDITOR = {
  fontSize: 13, tabSize: 2, wordWrap: 'off', minimap: true, lineNumbers: 'on',
  formatOnSave: false, stickyScroll: true, autoCloseBrackets: true, showWhitespace: false
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateSettings.mockResolvedValue(undefined)
  mockUseSettings.mockReturnValue({
    settings: { editor: DEFAULT_EDITOR, aiCommitMessages: true },
    updateSettings: mockUpdateSettings
  })
})

import { PluginBrowser } from '../../../../src/renderer/src/components/plugins/PluginBrowser'

describe('PluginBrowser', () => {
  it('renders the panel title', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('Extensions')).toBeTruthy()
  })

  it('shows Kode Plugins section', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('Kode Plugins')).toBeTruthy()
  })

  it('shows Format on Save toggle', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('Format on Save')).toBeTruthy()
  })

  it('shows AI Commit Messages toggle', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('AI Commit Messages')).toBeTruthy()
  })

  it('shows External Plugins coming soon section', () => {
    render(<PluginBrowser />)
    expect(screen.getByText('External Plugins')).toBeTruthy()
    expect(screen.getByText('Coming soon')).toBeTruthy()
  })

  it('calls updateSettings with toggled formatOnSave when Format on Save toggle is clicked', () => {
    render(<PluginBrowser />)
    const toggles = screen.getAllByRole('switch')
    fireEvent.click(toggles[0])
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ editor: expect.objectContaining({ formatOnSave: true }) })
    )
  })

  it('calls updateSettings with toggled aiCommitMessages when AI Commit Messages toggle is clicked', () => {
    render(<PluginBrowser />)
    const toggles = screen.getAllByRole('switch')
    fireEvent.click(toggles[1])
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ aiCommitMessages: false })
    )
  })

  it('reflects enabled state from settings for Format on Save', () => {
    mockUseSettings.mockReturnValue({
      settings: { editor: { ...DEFAULT_EDITOR, formatOnSave: true }, aiCommitMessages: true },
      updateSettings: mockUpdateSettings
    })
    render(<PluginBrowser />)
    const toggles = screen.getAllByRole('switch')
    expect(toggles[0].getAttribute('aria-checked')).toBe('true')
  })
})
