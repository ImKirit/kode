import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// Render XtermTerminal as a lightweight stub to avoid xterm DOM dependencies
vi.mock('@renderer/components/terminal/XtermTerminal', () => ({
  XtermTerminal: ({ termId }: { termId: string }) => (
    <div data-testid={`xterm-${termId}`} />
  )
}))

const mockUseTerminal = vi.fn()
vi.mock('@renderer/hooks/useTerminal', () => ({
  useTerminal: () => mockUseTerminal()
}))

import { TerminalPanel } from '@renderer/components/terminal/TerminalPanel'

const makeState = (overrides = {}) => ({
  terminals: [],
  activeTermId: null,
  createTerminal: vi.fn().mockResolvedValue(undefined),
  closeTerminal: vi.fn(),
  setActiveTerminal: vi.fn(),
  ...overrides
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TerminalPanel', () => {
  it('renders a "New Terminal" button', () => {
    mockUseTerminal.mockReturnValue(makeState())
    render(<TerminalPanel />)
    expect(screen.getByRole('button', { name: /new terminal/i })).toBeInTheDocument()
  })

  it('clicking "New Terminal" calls createTerminal', async () => {
    const state = makeState()
    mockUseTerminal.mockReturnValue(state)
    render(<TerminalPanel />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /new terminal/i }))
    })
    expect(state.createTerminal).toHaveBeenCalled()
  })

  it('renders a tab label for each terminal', () => {
    mockUseTerminal.mockReturnValue(makeState({
      terminals: [
        { id: 't1', title: 'Terminal 1' },
        { id: 't2', title: 'Terminal 2' }
      ],
      activeTermId: 't1'
    }))
    render(<TerminalPanel />)
    expect(screen.getByText('Terminal 1')).toBeInTheDocument()
    expect(screen.getByText('Terminal 2')).toBeInTheDocument()
  })

  it('clicking a tab calls setActiveTerminal with its id', () => {
    const state = makeState({
      terminals: [
        { id: 't1', title: 'Terminal 1' },
        { id: 't2', title: 'Terminal 2' }
      ],
      activeTermId: 't1'
    })
    mockUseTerminal.mockReturnValue(state)
    render(<TerminalPanel />)
    fireEvent.click(screen.getByText('Terminal 2'))
    expect(state.setActiveTerminal).toHaveBeenCalledWith('t2')
  })

  it('clicking the close button on a tab calls closeTerminal with its id', () => {
    const state = makeState({
      terminals: [{ id: 't1', title: 'Terminal 1' }],
      activeTermId: 't1'
    })
    mockUseTerminal.mockReturnValue(state)
    render(<TerminalPanel />)
    fireEvent.click(screen.getByLabelText('close terminal Terminal 1'))
    expect(state.closeTerminal).toHaveBeenCalledWith('t1')
  })

  it('all XtermTerminal instances are mounted (buffer preservation)', () => {
    mockUseTerminal.mockReturnValue(makeState({
      terminals: [
        { id: 't1', title: 'Terminal 1' },
        { id: 't2', title: 'Terminal 2' }
      ],
      activeTermId: 't1'
    }))
    render(<TerminalPanel />)
    expect(screen.getByTestId('xterm-t1')).toBeInTheDocument()
    expect(screen.getByTestId('xterm-t2')).toBeInTheDocument()
  })
})
