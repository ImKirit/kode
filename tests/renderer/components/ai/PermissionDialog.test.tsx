import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PermissionDialog } from '../../../../src/renderer/src/components/ai/PermissionDialog'

const baseProps = {
  callId: 'call-1',
  toolName: 'run_shell',
  serverId: '__builtin_shell',
  args: { command: 'echo hi' },
  onAllow: vi.fn(),
  onDeny: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PermissionDialog', () => {
  it('shows tool name', () => {
    render(<PermissionDialog {...baseProps} />)
    expect(screen.getByText('run_shell')).toBeTruthy()
  })

  it('shows server id', () => {
    render(<PermissionDialog {...baseProps} />)
    expect(screen.getByText('__builtin_shell')).toBeTruthy()
  })

  it('shows args preview', () => {
    render(<PermissionDialog {...baseProps} />)
    expect(screen.getByText(/echo hi/)).toBeTruthy()
  })

  it('calls onAllow when Allow button clicked', () => {
    const onAllow = vi.fn()
    render(<PermissionDialog {...baseProps} onAllow={onAllow} />)
    fireEvent.click(screen.getByText('Allow'))
    expect(onAllow).toHaveBeenCalled()
  })

  it('calls onDeny when Deny button clicked', () => {
    const onDeny = vi.fn()
    render(<PermissionDialog {...baseProps} onDeny={onDeny} />)
    fireEvent.click(screen.getByText('Deny'))
    expect(onDeny).toHaveBeenCalled()
  })

  it('calls onAllow on Enter key', () => {
    const onAllow = vi.fn()
    render(<PermissionDialog {...baseProps} onAllow={onAllow} />)
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onAllow).toHaveBeenCalled()
  })

  it('calls onDeny on Escape key', () => {
    const onDeny = vi.fn()
    render(<PermissionDialog {...baseProps} onDeny={onDeny} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDeny).toHaveBeenCalled()
  })
})
