import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChangesView } from '@renderer/components/git/ChangesView'

const mockStatus = vi.fn()
const mockDiff = vi.fn()
const mockStage = vi.fn()
const mockUnstage = vi.fn()
const mockStageAll = vi.fn()
const mockCommit = vi.fn()
const mockPush = vi.fn()
const mockPull = vi.fn()
const mockLog = vi.fn()

const defaultStatusResult = {
  files: [] as Array<{ path: string; index: string; workingDir: string; staged: boolean; modified: boolean }>,
  ahead: 0, behind: 0, current: 'main', tracking: 'origin/main'
}

beforeEach(() => {
  vi.clearAllMocks()
  mockStatus.mockResolvedValue(defaultStatusResult)
  mockDiff.mockResolvedValue('')
  mockStage.mockResolvedValue(undefined)
  mockUnstage.mockResolvedValue(undefined)
  mockStageAll.mockResolvedValue(undefined)
  mockCommit.mockResolvedValue(undefined)
  mockPush.mockResolvedValue(undefined)
  mockPull.mockResolvedValue(undefined)
  mockLog.mockResolvedValue([])
  ;(window as unknown as { kode: unknown }).kode = {
    git: {
      statusFull: mockStatus,
      diff: mockDiff,
      stage: mockStage,
      unstage: mockUnstage,
      stageAll: mockStageAll,
      commit: mockCommit,
      push: mockPush,
      pull: mockPull,
      log: mockLog
    }
  }
})

describe('ChangesView', () => {
  it('renders "No changes" when file list is empty', async () => {
    render(<ChangesView rootPath="/project" />)
    expect(await screen.findByText('No changes')).toBeInTheDocument()
  })

  it('renders current branch name', async () => {
    render(<ChangesView rootPath="/project" />)
    expect(await screen.findByText('main')).toBeInTheDocument()
  })

  it('renders unstaged file entries when files are present', async () => {
    mockStatus.mockResolvedValue({
      ...defaultStatusResult,
      files: [
        { path: 'src/foo.ts', index: ' ', workingDir: 'M', staged: false, modified: true },
        { path: 'src/bar.ts', index: 'A', workingDir: ' ', staged: true, modified: false }
      ]
    })
    render(<ChangesView rootPath="/project" />)
    expect(await screen.findByText('foo.ts')).toBeInTheDocument()
    expect(await screen.findByText('bar.ts')).toBeInTheDocument()
  })

  it('calls git.stage when stage button is clicked', async () => {
    mockStatus.mockResolvedValue({
      ...defaultStatusResult,
      files: [{ path: 'src/foo.ts', index: ' ', workingDir: 'M', staged: false, modified: true }]
    })
    render(<ChangesView rootPath="/project" />)
    // Use the "+" button (actionLabel) for individual file staging
    const stageBtn = await screen.findByRole('button', { name: /^Stage$/i })
    fireEvent.click(stageBtn)
    expect(mockStage).toHaveBeenCalledWith('/project', 'src/foo.ts')
  })

  it('calls git.commit when Commit button clicked with message and staged files', async () => {
    mockStatus.mockResolvedValue({
      ...defaultStatusResult,
      files: [{ path: 'src/foo.ts', index: 'M', workingDir: ' ', staged: true, modified: false }]
    })
    render(<ChangesView rootPath="/project" />)
    await screen.findByText('foo.ts')
    const input = screen.getByPlaceholderText(/commit message/i)
    fireEvent.change(input, { target: { value: 'feat: thing' } })
    fireEvent.click(screen.getByRole('button', { name: /commit staged/i }))
    expect(mockCommit).toHaveBeenCalledWith('/project', 'feat: thing')
  })

  it('shows message when no rootPath is provided', () => {
    render(<ChangesView rootPath={null} />)
    expect(screen.getByText(/open a folder/i)).toBeInTheDocument()
  })

  it('renders Push and Pull buttons', async () => {
    render(<ChangesView rootPath="/project" />)
    expect(await screen.findByRole('button', { name: /push/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /pull/i })).toBeInTheDocument()
  })
})
