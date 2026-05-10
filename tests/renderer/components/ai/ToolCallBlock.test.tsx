import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToolCallBlock } from '../../../../src/renderer/src/components/ai/ToolCallBlock'

describe('ToolCallBlock', () => {
  const baseProps = {
    toolName: 'read_file',
    serverId: '__builtin_filesystem',
    args: { path: '/tmp/hello.txt' },
    status: 'success' as const,
    result: 'hello world'
  }

  it('shows tool name in header', () => {
    render(<ToolCallBlock {...baseProps} />)
    expect(screen.getByText(/read_file/)).toBeTruthy()
  })

  it('shows server id in header', () => {
    render(<ToolCallBlock {...baseProps} />)
    expect(screen.getByText(/__builtin_filesystem/)).toBeTruthy()
  })

  it('shows args when expanded', () => {
    render(<ToolCallBlock {...baseProps} />)
    const header = screen.getByRole('button')
    fireEvent.click(header)
    expect(screen.getByText(/hello\.txt/)).toBeTruthy()
  })

  it('shows result when expanded', () => {
    render(<ToolCallBlock {...baseProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('shows pending status indicator', () => {
    render(<ToolCallBlock {...baseProps} status="pending" result={undefined} />)
    expect(screen.getByTitle('Pending')).toBeTruthy()
  })

  it('shows error status indicator', () => {
    render(<ToolCallBlock {...baseProps} status="error" />)
    expect(screen.getByTitle('Error')).toBeTruthy()
  })

  it('shows denied status indicator', () => {
    render(<ToolCallBlock {...baseProps} status="denied" />)
    expect(screen.getByTitle('Denied')).toBeTruthy()
  })
})
