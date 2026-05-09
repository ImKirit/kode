import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import React from 'react'

// vi.hoisted ensures these objects exist before vi.mock factories run
// (vi.mock is hoisted to the top of the file by Vitest; regular const declarations are not)
const { mockTerminalInst, mockFitAddonInst } = vi.hoisted(() => ({
  mockTerminalInst: {
    open: vi.fn(),
    write: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    onData: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    cols: 80,
    rows: 24
  },
  mockFitAddonInst: { fit: vi.fn() }
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => mockTerminalInst)
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => mockFitAddonInst)
}))

import { XtermTerminal } from '@renderer/components/terminal/XtermTerminal'

const mockCleanup = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).kode = {
    terminal: {
      onData: vi.fn().mockReturnValue(mockCleanup),
      onExit: vi.fn().mockReturnValue(() => {}),
      resize: vi.fn(),
      write: vi.fn()
    }
  }
})

afterEach(() => {
  cleanup()
})

describe('XtermTerminal', () => {
  it('opens the xterm terminal in its container element on mount', () => {
    render(<XtermTerminal termId="t1" isActive={true} />)
    expect(mockTerminalInst.open).toHaveBeenCalledWith(expect.any(HTMLElement))
  })

  it('subscribes to terminal data on mount', () => {
    render(<XtermTerminal termId="t1" isActive={true} />)
    expect((window as any).kode.terminal.onData).toHaveBeenCalledWith('t1', expect.any(Function))
  })

  it('writes incoming data to the xterm instance', () => {
    render(<XtermTerminal termId="t1" isActive={true} />)
    const dataHandler = vi.mocked((window as any).kode.terminal.onData).mock.calls[0][1]
    dataHandler('hello world')
    expect(mockTerminalInst.write).toHaveBeenCalledWith('hello world')
  })

  it('calls cleanup and disposes xterm on unmount', () => {
    const { unmount } = render(<XtermTerminal termId="t1" isActive={true} />)
    unmount()
    expect(mockCleanup).toHaveBeenCalled()
    expect(mockTerminalInst.dispose).toHaveBeenCalled()
  })

  it('calls fitAddon.fit when isActive changes to true', () => {
    const { rerender } = render(<XtermTerminal termId="t1" isActive={false} />)
    const callsBefore = mockFitAddonInst.fit.mock.calls.length
    rerender(<XtermTerminal termId="t1" isActive={true} />)
    expect(mockFitAddonInst.fit.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('subscribes to xterm onData to forward user input to the PTY', () => {
    render(<XtermTerminal termId="t1" isActive={true} />)
    expect(mockTerminalInst.onData).toHaveBeenCalled()
  })

  it('forwards user input from xterm to the PTY via window.kode.terminal.write', () => {
    render(<XtermTerminal termId="t1" isActive={true} />)
    const inputHandler = vi.mocked(mockTerminalInst.onData).mock.calls[0][0]
    inputHandler('ls\n')
    expect((window as any).kode.terminal.write).toHaveBeenCalledWith('t1', 'ls\n')
  })
})
