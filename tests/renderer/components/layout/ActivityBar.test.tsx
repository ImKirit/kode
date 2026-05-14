import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityBar } from '@renderer/components/layout/ActivityBar'

function makeProps(overrides = {}) {
  return {
    sidebarVisible: true,
    sidebarView: 'files' as const,
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

  it('renders Settings button when onOpenSettings provided', () => {
    render(<ActivityBar {...makeProps({ onOpenSettings: vi.fn() })} />)
    expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('renders Deploy button when onOpenDeploy provided', () => {
    render(<ActivityBar {...makeProps({ onOpenDeploy: vi.fn() })} />)
    expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument()
  })

  it('renders Plugin Marketplace button when onTogglePluginBrowser provided', () => {
    render(<ActivityBar {...makeProps({ onTogglePluginBrowser: vi.fn() })} />)
    expect(screen.getByRole('button', { name: /plugin marketplace/i })).toBeInTheDocument()
  })

  it('renders Local Host button when onToggleLocalHost provided', () => {
    render(<ActivityBar {...makeProps({ onToggleLocalHost: vi.fn() })} />)
    expect(screen.getByRole('button', { name: /local host/i })).toBeInTheDocument()
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

  it('sets aria-pressed=true on Explorer when sidebar visible', () => {
    render(<ActivityBar {...makeProps({ sidebarVisible: true })} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('sets aria-pressed=false on Explorer when sidebar is hidden', () => {
    render(<ActivityBar {...makeProps({ sidebarVisible: false })} />)
    expect(screen.getByRole('button', { name: /toggle explorer/i }))
      .toHaveAttribute('aria-pressed', 'false')
  })

  it('Local Host button shows active state when localHostActive=true', () => {
    render(<ActivityBar {...makeProps({ onToggleLocalHost: vi.fn(), localHostActive: true })} />)
    expect(screen.getByRole('button', { name: /local host/i }))
      .toHaveAttribute('aria-pressed', 'true')
  })
})
