import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '@renderer/components/ai/ChatMessage'

describe('ChatMessage', () => {
  it('renders user message content', () => {
    render(<ChatMessage role="user" content="Hello world" isStreaming={false} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders assistant message content', () => {
    render(<ChatMessage role="assistant" content="Hi there!" isStreaming={false} />)
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows blinking cursor when assistant is streaming', () => {
    const { container } = render(
      <ChatMessage role="assistant" content="Typing..." isStreaming={true} />
    )
    const cursor = container.querySelector('[data-testid="streaming-cursor"]')
    expect(cursor).toBeInTheDocument()
  })

  it('does not show cursor when not streaming', () => {
    const { container } = render(
      <ChatMessage role="assistant" content="Done" isStreaming={false} />
    )
    const cursor = container.querySelector('[data-testid="streaming-cursor"]')
    expect(cursor).not.toBeInTheDocument()
  })

  it('does not show cursor for user messages even if streaming=true', () => {
    const { container } = render(
      <ChatMessage role="user" content="Hey" isStreaming={true} />
    )
    const cursor = container.querySelector('[data-testid="streaming-cursor"]')
    expect(cursor).not.toBeInTheDocument()
  })

  it('renders empty content without crashing (streaming placeholder)', () => {
    const { container } = render(
      <ChatMessage role="assistant" content="" isStreaming={true} />
    )
    expect(container.firstChild).toBeInTheDocument()
  })
})
