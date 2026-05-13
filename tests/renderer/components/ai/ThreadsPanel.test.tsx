import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThreadsPanel } from '../../../../src/renderer/src/components/ai/ThreadsPanel'
import type { ChatSession } from '../../../../src/renderer/src/types/electron'

const mockSession = (id: string, name: string): ChatSession => ({
  id, name, provider: 'anthropic', model: 'claude', created_at: Date.now(), updated_at: Date.now(), archived: 0
})

const defaultProps = {
  sessions: [],
  currentSessionId: null,
  searchResults: [],
  searchQuery: '',
  onSelect: vi.fn(),
  onNew: vi.fn(),
  onRename: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
  onSearch: vi.fn(),
  onClearSearch: vi.fn(),
}

describe('ThreadsPanel', () => {
  it('renders header', () => {
    render(<ThreadsPanel {...defaultProps} />)
    expect(screen.getByText('Threads')).toBeTruthy()
  })

  it('shows empty state when no sessions', () => {
    render(<ThreadsPanel {...defaultProps} />)
    expect(screen.getByText('No threads yet')).toBeTruthy()
  })

  it('renders sessions', () => {
    const sessions = [mockSession('s1', 'Chat One'), mockSession('s2', 'Chat Two')]
    render(<ThreadsPanel {...defaultProps} sessions={sessions} />)
    expect(screen.getByText('Chat One')).toBeTruthy()
    expect(screen.getByText('Chat Two')).toBeTruthy()
  })

  it('calls onSelect when session row is clicked', () => {
    const onSelect = vi.fn()
    const sessions = [mockSession('s1', 'My Chat')]
    render(<ThreadsPanel {...defaultProps} sessions={sessions} onSelect={onSelect} />)
    const rows = screen.getAllByTestId('session-row')
    fireEvent.click(rows[0])
    expect(onSelect).toHaveBeenCalledWith('s1')
  })

  it('calls onNew when + button is clicked', () => {
    const onNew = vi.fn()
    render(<ThreadsPanel {...defaultProps} onNew={onNew} />)
    fireEvent.click(screen.getByLabelText('New thread'))
    expect(onNew).toHaveBeenCalled()
  })

  it('calls onSearch when search input changes', () => {
    const onSearch = vi.fn()
    render(<ThreadsPanel {...defaultProps} onSearch={onSearch} />)
    const input = screen.getByPlaceholderText('Search threads...')
    fireEvent.change(input, { target: { value: 'foo' } })
    expect(onSearch).toHaveBeenCalledWith('foo')
  })

  it('shows search results when searchQuery is set', () => {
    const searchResults = [{
      session: mockSession('s1', 'Work Chat'),
      snippet: '...refactor...'
    }]
    render(
      <ThreadsPanel
        {...defaultProps}
        searchQuery="refactor"
        searchResults={searchResults}
      />
    )
    expect(screen.getByText('Work Chat')).toBeTruthy()
    expect(screen.getByText(/refactor/)).toBeTruthy()
  })

  it('shows no results message when search has no results', () => {
    render(
      <ThreadsPanel
        {...defaultProps}
        searchQuery="xyz"
        searchResults={[]}
      />
    )
    expect(screen.getByText('No results')).toBeTruthy()
  })
})
