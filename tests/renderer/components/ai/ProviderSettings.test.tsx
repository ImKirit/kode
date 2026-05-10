import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockSetActiveProvider = vi.fn().mockResolvedValue(undefined)
const mockSetProviderKey = vi.fn().mockResolvedValue(undefined)
const mockSetProviderModel = vi.fn().mockResolvedValue(undefined)
const mockOnClose = vi.fn()

const DEFAULT_SETTINGS = {
  activeProvider: 'anthropic' as const,
  providers: {
    anthropic: { apiKey: 'sk-ant-existing', model: 'claude-sonnet-4-6' },
    openai: { apiKey: '', model: 'gpt-4o' }
  }
}

import { ProviderSettings } from '@renderer/components/ai/ProviderSettings'

beforeEach(() => {
  mockSetActiveProvider.mockClear()
  mockSetProviderKey.mockClear()
  mockSetProviderModel.mockClear()
  mockOnClose.mockClear()
})

describe('ProviderSettings', () => {
  it('renders the provider selector with Anthropic and OpenAI options', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })

  it('shows the current active provider as selected', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    const anthropicBtn = screen.getByRole('button', { name: /anthropic/i })
    expect(anthropicBtn).toHaveAttribute('aria-pressed', 'true')
    const openaiBtn = screen.getByRole('button', { name: /openai/i })
    expect(openaiBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSetActiveProvider when switching provider', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /openai/i }))
    expect(mockSetActiveProvider).toHaveBeenCalledWith('openai')
  })

  it('shows connected state when provider has an API key', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByText('API key connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('calls onSetProviderKey with empty string when Disconnect is clicked', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
    expect(mockSetProviderKey).toHaveBeenCalledWith('anthropic', '')
  })

  it('shows Connect Account button when provider has no API key', () => {
    const disconnectedSettings = {
      ...DEFAULT_SETTINGS,
      activeProvider: 'openai' as const
    }
    render(
      <ProviderSettings
        settings={disconnectedSettings}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByRole('button', { name: /connect account/i })).toBeInTheDocument()
  })

  it('shows key input form when Connect Account is clicked', () => {
    const disconnectedSettings = {
      ...DEFAULT_SETTINGS,
      activeProvider: 'openai' as const
    }
    render(
      <ProviderSettings
        settings={disconnectedSettings}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /connect account/i }))
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
  })

  it('calls onSetProviderKey when Save Key is clicked with a value', () => {
    const disconnectedSettings = {
      ...DEFAULT_SETTINGS,
      activeProvider: 'openai' as const
    }
    render(
      <ProviderSettings
        settings={disconnectedSettings}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /connect account/i }))
    const input = screen.getByLabelText('API Key')
    fireEvent.change(input, { target: { value: 'sk-new-key' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(mockSetProviderKey).toHaveBeenCalledWith('openai', 'sk-new-key')
  })

  it('shows model selector for active provider', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('calls onSetProviderModel when model selector changes', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'claude-opus-4-6' } })
    expect(mockSetProviderModel).toHaveBeenCalledWith('anthropic', 'claude-opus-4-6')
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(mockOnClose).toHaveBeenCalled()
  })
})
