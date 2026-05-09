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

  it('shows API key input for active provider', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    const keyInput = screen.getByPlaceholderText('sk-ant-...')
    expect(keyInput).toBeInTheDocument()
  })

  it('calls onSetProviderKey when API key input changes', () => {
    render(
      <ProviderSettings
        settings={DEFAULT_SETTINGS}
        onSetActiveProvider={mockSetActiveProvider}
        onSetProviderKey={mockSetProviderKey}
        onSetProviderModel={mockSetProviderModel}
        onClose={mockOnClose}
      />
    )
    const keyInput = screen.getByPlaceholderText('sk-ant-...')
    fireEvent.change(keyInput, { target: { value: 'sk-ant-new' } })
    expect(mockSetProviderKey).toHaveBeenCalledWith('anthropic', 'sk-ant-new')
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
