import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockSetActiveProvider = vi.fn().mockResolvedValue(undefined)
const mockSetProviderKey = vi.fn().mockResolvedValue(undefined)
const mockSetProviderModel = vi.fn().mockResolvedValue(undefined)
const mockOnClose = vi.fn()
const mockOnOpenAccountSettings = vi.fn()

const DEFAULT_SETTINGS = {
  activeProvider: 'anthropic' as const,
  providers: {
    anthropic: { apiKey: 'sk-ant-existing', model: 'claude-sonnet-4-6' },
    openai: { apiKey: '', model: 'gpt-4o' },
    kode: { apiKey: '', model: 'claude-sonnet-4-6' },
    copilot: { apiKey: '', model: 'gpt-4o' }
  }
}

import { ProviderSettings } from '@renderer/components/ai/ProviderSettings'

beforeEach(() => {
  mockSetActiveProvider.mockClear()
  mockSetProviderKey.mockClear()
  mockSetProviderModel.mockClear()
  mockOnClose.mockClear()
  mockOnOpenAccountSettings.mockClear()
})

function renderPS(settingsOverrides = {}, propOverrides = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...settingsOverrides }
  return render(
    <ProviderSettings
      settings={settings}
      onSetActiveProvider={mockSetActiveProvider}
      onSetProviderKey={mockSetProviderKey}
      onSetProviderModel={mockSetProviderModel}
      onClose={mockOnClose}
      onOpenAccountSettings={mockOnOpenAccountSettings}
      {...propOverrides}
    />
  )
}

describe('ProviderSettings', () => {
  it('renders provider selector with Claude and Codex labels', () => {
    renderPS()
    expect(screen.getByText('Claude')).toBeTruthy()
    expect(screen.getByText('Codex')).toBeTruthy()
  })

  it('shows Kode and Copilot providers', () => {
    renderPS()
    expect(screen.getByText('Kode')).toBeTruthy()
    expect(screen.getByText('Copilot')).toBeTruthy()
  })

  it('shows the current active provider as selected', () => {
    renderPS()
    const claudeBtn = screen.getByRole('button', { name: /^claude$/i })
    expect(claudeBtn).toHaveAttribute('aria-pressed', 'true')
    const codexBtn = screen.getByRole('button', { name: /^codex$/i })
    expect(codexBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSetActiveProvider when switching provider', () => {
    renderPS()
    fireEvent.click(screen.getByRole('button', { name: /^codex$/i }))
    expect(mockSetActiveProvider).toHaveBeenCalledWith('openai')
  })

  it('shows connected state when provider has an API key', () => {
    renderPS()
    expect(screen.getByText('API key connected')).toBeTruthy()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeTruthy()
  })

  it('calls onSetProviderKey with empty string when Disconnect is clicked', () => {
    renderPS()
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
    expect(mockSetProviderKey).toHaveBeenCalledWith('anthropic', '')
  })

  it('shows Connect Account button when provider has no API key', () => {
    renderPS({ activeProvider: 'openai' as const })
    expect(screen.getByRole('button', { name: /connect account/i })).toBeTruthy()
  })

  it('shows Account and API tabs when Connect Account is clicked', () => {
    renderPS({ activeProvider: 'openai' as const })
    fireEvent.click(screen.getByRole('button', { name: /connect account/i }))
    expect(screen.getByRole('button', { name: /^account$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^api$/i })).toBeTruthy()
  })

  it('shows API key input when API tab is clicked', () => {
    renderPS({ activeProvider: 'openai' as const })
    fireEvent.click(screen.getByRole('button', { name: /connect account/i }))
    fireEvent.click(screen.getByRole('button', { name: /^api$/i }))
    expect(screen.getByLabelText('API Key')).toBeTruthy()
  })

  it('calls onSetProviderKey when Save Key is clicked with a value', () => {
    renderPS({ activeProvider: 'openai' as const })
    fireEvent.click(screen.getByRole('button', { name: /connect account/i }))
    fireEvent.click(screen.getByRole('button', { name: /^api$/i }))
    const input = screen.getByLabelText('API Key')
    fireEvent.change(input, { target: { value: 'sk-new-key' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockSetProviderKey).toHaveBeenCalledWith('openai', 'sk-new-key')
  })

  it('calls onClose when close button is clicked', () => {
    renderPS()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows Go to Account Settings button for Kode provider', () => {
    renderPS({ activeProvider: 'kode' as const })
    expect(screen.getByRole('button', { name: /go to account settings/i })).toBeTruthy()
  })

  it('calls onOpenAccountSettings when Go to Account Settings is clicked for Kode', () => {
    renderPS({ activeProvider: 'kode' as const })
    fireEvent.click(screen.getByRole('button', { name: /go to account settings/i }))
    expect(mockOnOpenAccountSettings).toHaveBeenCalled()
  })

  it('shows Go to Account Settings button for Copilot provider', () => {
    renderPS({ activeProvider: 'copilot' as const })
    expect(screen.getByRole('button', { name: /go to account settings/i })).toBeTruthy()
  })

  it('does not show model selector', () => {
    renderPS()
    expect(screen.queryByRole('combobox')).not.toBeTruthy()
  })
})
