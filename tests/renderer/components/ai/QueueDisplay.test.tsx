import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueueDisplay } from '@renderer/components/ai/QueueDisplay'

describe('QueueDisplay', () => {
  it('renders nothing when queue is empty and no countdown', () => {
    const { container } = render(
      <QueueDisplay queue={[]} retryCountdown={null} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders queue-display when queue has items', () => {
    render(
      <QueueDisplay queue={['hello']} retryCountdown={null} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByTestId('queue-display')).toBeInTheDocument()
  })

  it('renders queue item text', () => {
    render(
      <QueueDisplay queue={['first prompt', 'second prompt']} retryCountdown={null} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByText('first prompt')).toBeInTheDocument()
    expect(screen.getByText('second prompt')).toBeInTheDocument()
  })

  it('calls onRemove with correct index when remove button clicked', () => {
    const onRemove = vi.fn()
    render(
      <QueueDisplay queue={['a', 'b', 'c']} retryCountdown={null} onRemove={onRemove} onClearQueue={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /remove queued prompt 2/i }))
    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('calls onClearQueue when Clear all button is clicked', () => {
    const onClearQueue = vi.fn()
    render(
      <QueueDisplay queue={['item']} retryCountdown={null} onRemove={vi.fn()} onClearQueue={onClearQueue} />
    )
    fireEvent.click(screen.getByRole('button', { name: /clear queue/i }))
    expect(onClearQueue).toHaveBeenCalledTimes(1)
  })

  it('renders retry countdown when retryCountdown is non-null', () => {
    render(
      <QueueDisplay queue={[]} retryCountdown={42} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByTestId('retry-countdown')).toBeInTheDocument()
    expect(screen.getByText(/retrying in 42s/i)).toBeInTheDocument()
  })

  it('renders both countdown and queue items together', () => {
    render(
      <QueueDisplay queue={['pending']} retryCountdown={10} onRemove={vi.fn()} onClearQueue={vi.fn()} />
    )
    expect(screen.getByTestId('retry-countdown')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })
})
