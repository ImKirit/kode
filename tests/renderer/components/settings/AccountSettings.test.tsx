import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AccountSettings } from '@renderer/components/settings/AccountSettings'

const mockGetSession = vi.fn()
const mockLogin = vi.fn()
const mockSignup = vi.fn()
const mockLogout = vi.fn()
const mockGetToken = vi.fn()
const mockGetStats = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue(null)
  mockLogin.mockResolvedValue({ ok: false, error: 'Invalid credentials' })
  mockSignup.mockResolvedValue({ ok: false, error: 'Email already taken' })
  mockLogout.mockResolvedValue(undefined)
  mockGetToken.mockResolvedValue(null)
  mockGetStats.mockResolvedValue({ today: 0, week: 0, allTime: 0, byDay: {} })
  ;(window as unknown as { kode: unknown }).kode = {
    auth: {
      getSession: mockGetSession,
      login: mockLogin,
      signup: mockSignup,
      logout: mockLogout,
      getToken: mockGetToken
    },
    usage: {
      getStats: mockGetStats,
      add: vi.fn().mockResolvedValue(undefined)
    }
  }
})

describe('AccountSettings', () => {
  it('shows login form when not signed in', async () => {
    render(<AccountSettings />)
    expect(await screen.findByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('shows Sign In / Create Account toggle', async () => {
    render(<AccountSettings />)
    await screen.findByPlaceholderText('you@example.com')
    const signInBtns = screen.getAllByRole('button', { name: /sign in/i })
    expect(signInBtns.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('switches to signup mode when Create Account is clicked', async () => {
    render(<AccountSettings />)
    await screen.findByPlaceholderText('you@example.com')
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument()
  })

  it('calls auth.login when sign in form is submitted', async () => {
    mockLogin.mockResolvedValue({ ok: true, email: 'a@b.com', plan: 'pro' })
    render(<AccountSettings />)
    await screen.findByPlaceholderText('you@example.com')
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/your password/i), { target: { value: 'secret' } })
    fireEvent.submit(screen.getByPlaceholderText('you@example.com').closest('form')!)
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'secret')
    })
  })

  it('shows error message on failed login', async () => {
    render(<AccountSettings />)
    await screen.findByPlaceholderText('you@example.com')
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(/your password/i), { target: { value: 'wrong' } })
    fireEvent.submit(screen.getByPlaceholderText('you@example.com').closest('form')!)
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('shows user email when session exists', async () => {
    mockGetSession.mockResolvedValue({ token: 'tok', email: 'user@kode.dev', plan: 'pro' })
    render(<AccountSettings />)
    expect(await screen.findByText('user@kode.dev')).toBeInTheDocument()
  })

  it('shows plan badge when logged in', async () => {
    mockGetSession.mockResolvedValue({ token: 'tok', email: 'user@kode.dev', plan: 'pro' })
    render(<AccountSettings />)
    expect(await screen.findByText('Pro')).toBeInTheDocument()
  })

  it('calls auth.logout when Sign out is clicked', async () => {
    mockGetSession.mockResolvedValue({ token: 'tok', email: 'user@kode.dev' })
    render(<AccountSettings />)
    const btn = await screen.findByRole('button', { name: /sign out/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  it('shows usage stats when logged in and stats available', async () => {
    mockGetSession.mockResolvedValue({ token: 'tok', email: 'user@kode.dev' })
    mockGetStats.mockResolvedValue({ today: 1200, week: 45000, allTime: 500000, byDay: {} })
    render(<AccountSettings />)
    await screen.findByText('user@kode.dev')
    expect(await screen.findByText('1.2k')).toBeInTheDocument()
    expect(screen.getByText('45.0k')).toBeInTheDocument()
    expect(screen.getByText('500.0k')).toBeInTheDocument()
  })
})
