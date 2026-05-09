import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityBar } from '@renderer/components/layout/ActivityBar'

function makeProps(overrides = {}) {
  return {
    sidebarVisible: true,
    aiPanelVisible: true,
    bottomPanelVisible: true,
    onToggleSidebar: vi.fn(),
    onToggleAiPanel: vi.fn(),
    onToggleBottomPanel: vi.fn(),
    ...overrides
  }
}

describe('ActivityBar', () => {
  it('renders the activity bar container', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByTestId('activity-bar')).toBeInTheDocument()
  })

  it('renders Toggle Explorer button', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i })).toBeInTheDocument()
  })

  it('renders Toggle AI Panel button', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByRole('button', { name: /toggle ai panel/i })).toBeInTheDocument()
  })

  it('renders Toggle Terminal button', () => {
    render(<ActivityBar {...makeProps()} />)
    expect(screen.getByRole('button', { name: /toggle terminal/i })).toBeInTheDocument()
  })

  it('calls onToggleSidebar when Explorer button is clicked', () => {
    const props = makeProps()
    render(<ActivityBar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle explorer/i }))
    expect(props.onToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleAiPanel when AI Panel button is clicked', () => {
    const props = makeProps()
    render(<ActivityBar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle ai panel/i }))
    expect(props.onToggleAiPanel).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleBottomPanel when Terminal button is clicked', () => {
    const props = makeProps()
    render(<ActivityBar {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /toggle terminal/i }))
    expect(props.onToggleBottomPanel).toHaveBeenCalledTimes(1)
  })

  it('sets aria-pressed=true on Explorer when sidebar is visible', () => {
    render(<ActivityBar {...makeProps({ sidebarVisible: true })} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed=false on Explorer when sidebar is hidden', () => {
    render(<ActivityBar {...makeProps({ sidebarVisible: false })} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i }))
      .toHaveAttribute('aria-pressed', 'false')
  })
})
