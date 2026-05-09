import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockSendMessage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockStop = vi.hoisted(() => vi.fn())
const mockClearMessages = vi.hoisted(() => vi.fn())
const mockUseAIChat = vi.hoisted(() => vi.fn())

const mockSetActiveProvider = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSetProviderKey = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSetProviderModel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUpdateSettings = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUseSettings = vi.hoisted(() => vi.fn())

vi.mock('@renderer/hooks/useAIChat', () => ({ useAIChat: mockUseAIChat }))
vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: mockUseSettings }))
vi.mock('@renderer/components/ai/ChatMessage', () => ({
  ChatMessage: ({ content }: { content: string }) => <div data-testid="chat-message">{content}</div>
}))
vi.mock('@renderer/components/ai/ProviderSettings', () => ({
  ProviderSettings: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="provider-settings">
      <button onClick={onClose}>Close Settings</button>
    </div>
  )
}))

const DEFAULT_SETTINGS = {
  activeProvider: 'anthropic' as const,
  providers: {
    anthropic: { apiKey: 'sk-ant', model: 'claude-sonnet-4-6' },
    openai: { apiKey: '', model: 'gpt-4o' }
  }
}

function defaultChatState(overrides = {}) {
  return {
    messages: [],
    isStreaming: false,
    error: null,
    sendMessage: mockSendMessage,
    stop: mockStop,
    clearMessages: mockClearMessages,
    ...overrides
  }
}

function defaultSettingsState(overrides = {}) {
  return {
    settings: DEFAULT_SETTINGS,
    loading: false,
    updateSettings: mockUpdateSettings,
    setActiveProvider: mockSetActiveProvider,
    setProviderKey: mockSetProviderKey,
    setProviderModel: mockSetProviderModel,
    ...overrides
  }
}

import { AIChatPanel } from '@renderer/components/ai/AIChatPanel'

beforeEach(() => {
  mockSendMessage.mockClear()
  mockStop.mockClear()
  mockClearMessages.mockClear()
  mockUpdateSettings.mockClear()
  mockUseAIChat.mockReturnValue(defaultChatState())
  mockUseSettings.mockReturnValue(defaultSettingsState())
})

describe('AIChatPanel', () => {
  it('renders the AI Agent header', () => {
    render(<AIChatPanel />)
    expect(screen.getByText('AI Agent')).toBeInTheDocument()
  })

  it('shows settings gear button', () => {
    render(<AIChatPanel />)
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('shows model badge with current provider and model', () => {
    render(<AIChatPanel />)
    expect(screen.getByText(/claude-sonnet/i)).toBeInTheDocument()
  })

  it('renders the message input textarea', () => {
    render(<AIChatPanel />)
    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
  })

  it('calls sendMessage when Send button is clicked with non-empty input', () => {
    render(<AIChatPanel />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendMessage).toHaveBeenCalledWith('Hello')
  })

  it('does not call sendMessage when input is empty', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('shows Stop button when streaming', () => {
    mockUseAIChat.mockReturnValue(defaultChatState({ isStreaming: true }))
    render(<AIChatPanel />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('calls stop() when Stop button is clicked', () => {
    mockUseAIChat.mockReturnValue(defaultChatState({ isStreaming: true }))
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(mockStop).toHaveBeenCalled()
  })

  it('renders error message when error is set', () => {
    mockUseAIChat.mockReturnValue(defaultChatState({ error: 'No API key configured' }))
    render(<AIChatPanel />)
    expect(screen.getByText('No API key configured')).toBeInTheDocument()
  })

  it('opens ProviderSettings when gear is clicked', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByTestId('provider-settings')).toBeInTheDocument()
  })

  it('closes ProviderSettings when close is called from within it', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    fireEvent.click(screen.getByText('Close Settings'))
    expect(screen.queryByTestId('provider-settings')).not.toBeInTheDocument()
  })

  it('sends message on Enter key', () => {
    render(<AIChatPanel />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Message...'), { key: 'Enter', shiftKey: false })
    expect(mockSendMessage).toHaveBeenCalledWith('Hello')
  })

  it('does not send on Shift+Enter', () => {
    render(<AIChatPanel />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Message...'), { key: 'Enter', shiftKey: true })
    expect(mockSendMessage).not.toHaveBeenCalled()
  })
})
