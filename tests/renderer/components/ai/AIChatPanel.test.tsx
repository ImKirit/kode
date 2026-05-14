import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockSendOrEnqueue = vi.hoisted(() => vi.fn())
const mockStop = vi.hoisted(() => vi.fn())
const mockClearMessages = vi.hoisted(() => vi.fn())
const mockRemoveFromQueue = vi.hoisted(() => vi.fn())
const mockClearQueue = vi.hoisted(() => vi.fn())
const mockOnToggleAutoFollow = vi.hoisted(() => vi.fn())
const mockUseScheduler = vi.hoisted(() => vi.fn())

const mockSetActiveProvider = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSetProviderKey = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockSetProviderModel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUpdateSettings = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockUseSettings = vi.hoisted(() => vi.fn())
const mockOnOpenAccountSettings = vi.hoisted(() => vi.fn())

vi.mock('@renderer/hooks/useScheduler', () => ({ useScheduler: mockUseScheduler }))
vi.mock('@renderer/hooks/useSettings', () => ({ useSettings: mockUseSettings }))
vi.mock('@renderer/components/ai/ChatMessage', () => ({
  ChatMessage: ({ content }: { content: string }) => <div data-testid="chat-message">{content}</div>
}))
vi.mock('@renderer/components/ai/ProviderSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@renderer/components/ai/ProviderSettings')>()
  return {
    ...actual,
    ProviderSettings: ({ onClose }: { onClose: () => void }) => (
      <div data-testid="provider-settings">
        <button onClick={onClose}>Close Settings</button>
      </div>
    )
  }
})
vi.mock('@renderer/components/ai/QueueDisplay', () => ({
  QueueDisplay: ({ queue, retryCountdown, onRemove, onClearQueue }: {
    queue: string[]; retryCountdown: number | null;
    onRemove: (i: number) => void; onClearQueue: () => void
  }) => (
    <div data-testid="queue-display-mock"
      data-queue={JSON.stringify(queue)}
      data-countdown={retryCountdown}>
      {retryCountdown !== null && <span data-testid="countdown">{retryCountdown}</span>}
      {queue.map((t, i) => <span key={i} data-testid={`queued-${i}`}>{t}</span>)}
      <button aria-label="mock-remove" onClick={() => onRemove(0)} />
      <button aria-label="mock-clear" onClick={onClearQueue} />
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

function defaultSchedulerState(overrides = {}) {
  return {
    messages: [],
    isStreaming: false,
    error: null,
    retryCountdown: null,
    queue: [],
    sessionTokens: 0,
    sendOrEnqueue: mockSendOrEnqueue,
    stop: mockStop,
    clearMessages: mockClearMessages,
    removeFromQueue: mockRemoveFromQueue,
    clearQueue: mockClearQueue,
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
  mockSendOrEnqueue.mockClear()
  mockStop.mockClear()
  mockClearMessages.mockClear()
  mockOnToggleAutoFollow.mockClear()
  mockOnOpenAccountSettings.mockClear()
  mockUseScheduler.mockReturnValue(defaultSchedulerState())
  mockUseSettings.mockReturnValue(defaultSettingsState())
  ;(window as unknown as { kode: unknown }).kode = {
    usage: { getStats: vi.fn().mockResolvedValue({ today: 0, week: 0, allTime: 0, byDay: {} }) },
    scheduler: {
      onFire: vi.fn().mockReturnValue(() => {}),
      add: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([])
    }
  }
})

describe('AIChatPanel', () => {
  it('renders the AI Agent header', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
  })

  it('shows settings gear button', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('shows model selector for current provider', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByRole('combobox', { name: /model/i })).toBeInTheDocument()
  })

  it('shows Effort pill button', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByRole('button', { name: /effort/i })).toBeInTheDocument()
  })

  it('shows Permissions pill button', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByRole('button', { name: /permissions/i })).toBeInTheDocument()
  })

  it('renders the message input textarea', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
  })

  it('calls sendOrEnqueue when Send button is clicked with non-empty input', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendOrEnqueue).toHaveBeenCalledWith('Hello', undefined)
  })

  it('does not call sendOrEnqueue when input is empty', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(mockSendOrEnqueue).not.toHaveBeenCalled()
  })

  it('shows Stop button when streaming', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ isStreaming: true }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('shows Stop button when retryCountdown is active', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ retryCountdown: 30 }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('textarea is NOT disabled when retryCountdown is active', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ retryCountdown: 30 }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByPlaceholderText('Message...')).not.toBeDisabled()
  })

  it('textarea is disabled when streaming', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ isStreaming: true }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByPlaceholderText('Message...')).toBeDisabled()
  })

  it('calls stop() when Stop button is clicked', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ isStreaming: true }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    expect(mockStop).toHaveBeenCalled()
  })

  it('renders error message when error is set', () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({ error: 'No API key configured' }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByText('No API key configured')).toBeInTheDocument()
  })

  it('opens ProviderSettings when gear is clicked', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByTestId('provider-settings')).toBeInTheDocument()
  })

  it('closes ProviderSettings when close is called from within it', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    fireEvent.click(screen.getByText('Close Settings'))
    expect(screen.queryByTestId('provider-settings')).not.toBeInTheDocument()
  })

  it('sends message on Enter key', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Message...'), { key: 'Enter', shiftKey: false })
    expect(mockSendOrEnqueue).toHaveBeenCalledWith('Hello', undefined)
  })

  it('does not send on Shift+Enter', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.change(screen.getByPlaceholderText('Message...'), { target: { value: 'Hello' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Message...'), { key: 'Enter', shiftKey: true })
    expect(mockSendOrEnqueue).not.toHaveBeenCalled()
  })

  it('renders QueueDisplay', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    expect(screen.getByTestId('queue-display-mock')).toBeInTheDocument()
  })

  it('wires removeFromQueue and clearQueue to QueueDisplay', async () => {
    mockUseScheduler.mockReturnValue(defaultSchedulerState({
      queue: ['pending prompt'],
      removeFromQueue: mockRemoveFromQueue,
      clearQueue: mockClearQueue
    }))
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.click(screen.getByRole('button', { name: 'mock-remove' }))
    expect(mockRemoveFromQueue).toHaveBeenCalledWith(0)
    fireEvent.click(screen.getByRole('button', { name: 'mock-clear' }))
    expect(mockClearQueue).toHaveBeenCalled()
  })

  it('renders Auto Follow button with aria-pressed=false when disabled', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    const btn = screen.getByRole('button', { name: 'Auto Follow' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggleAutoFollow when Auto Follow button is clicked', () => {
    render(<AIChatPanel autoFollowEnabled={false} onToggleAutoFollow={mockOnToggleAutoFollow} />)
    fireEvent.click(screen.getByRole('button', { name: 'Auto Follow' }))
    expect(mockOnToggleAutoFollow).toHaveBeenCalledTimes(1)
  })
})
