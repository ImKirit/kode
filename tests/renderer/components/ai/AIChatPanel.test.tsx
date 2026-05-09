import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const {
  mockSendMessage,
  mockStop,
  mockSetApiKey,
  mockClearMessages,
  mockUseAIChat
} = vi.hoisted(() => ({
  mockSendMessage: vi.fn().mockResolvedValue(undefined),
  mockStop: vi.fn(),
  mockSetApiKey: vi.fn(),
  mockClearMessages: vi.fn(),
  mockUseAIChat: vi.fn()
}))

// Mock useAIChat
vi.mock('@renderer/hooks/useAIChat', () => ({
  useAIChat: mockUseAIChat
}))

// Mock ChatMessage so we don't need all its deps
vi.mock('@renderer/components/ai/ChatMessage', () => ({
  ChatMessage: ({ content }: { content: string }) => <div data-testid="chat-message">{content}</div>
}))

function defaultHookState(overrides = {}) {
  return {
    messages: [],
    isStreaming: false,
    error: null,
    apiKey: '',
    setApiKey: mockSetApiKey,
    sendMessage: mockSendMessage,
    stop: mockStop,
    clearMessages: mockClearMessages,
    ...overrides
  }
}

import { AIChatPanel } from '@renderer/components/ai/AIChatPanel'

beforeEach(() => {
  mockSendMessage.mockClear()
  mockStop.mockClear()
  mockSetApiKey.mockClear()
  mockClearMessages.mockClear()
  mockUseAIChat.mockReturnValue(defaultHookState())
})

describe('AIChatPanel', () => {
  it('renders the AI Agent header', () => {
    render(<AIChatPanel />)
    expect(screen.getByText('AI Agent')).toBeInTheDocument()
  })

  it('renders the API key input', () => {
    render(<AIChatPanel />)
    expect(screen.getByPlaceholderText('Anthropic API key')).toBeInTheDocument()
  })

  it('renders the message input textarea', () => {
    render(<AIChatPanel />)
    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
  })

  it('calls sendMessage when Send button is clicked with non-empty input', () => {
    render(<AIChatPanel />)
    const input = screen.getByPlaceholderText('Message...')
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendMessage).toHaveBeenCalledWith('Hello')
  })

  it('does not call sendMessage when input is empty', () => {
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('calls setApiKey when API key input changes', () => {
    render(<AIChatPanel />)
    const keyInput = screen.getByPlaceholderText('Anthropic API key')
    fireEvent.change(keyInput, { target: { value: 'sk-test' } })
    expect(mockSetApiKey).toHaveBeenCalledWith('sk-test')
  })

  it('shows Stop button when streaming', () => {
    mockUseAIChat.mockReturnValue(defaultHookState({ isStreaming: true }))
    render(<AIChatPanel />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('calls stop() when Stop button is clicked', () => {
    mockUseAIChat.mockReturnValue(defaultHookState({ isStreaming: true }))
    render(<AIChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(mockStop).toHaveBeenCalled()
  })

  it('renders error message when error is set', () => {
    mockUseAIChat.mockReturnValue(defaultHookState({ error: 'Invalid API key' }))
    render(<AIChatPanel />)
    expect(screen.getByText('Invalid API key')).toBeInTheDocument()
  })

  it('renders chat messages', () => {
    mockUseAIChat.mockReturnValue(defaultHookState({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' }
      ]
    }))
    render(<AIChatPanel />)
    const msgs = screen.getAllByTestId('chat-message')
    expect(msgs).toHaveLength(2)
    expect(msgs[0]).toHaveTextContent('Hello')
    expect(msgs[1]).toHaveTextContent('Hi there')
  })
})
