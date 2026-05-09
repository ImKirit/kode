import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChangesView } from '@renderer/components/git/ChangesView'

const mockRefresh = vi.fn()
const mockSelectFile = vi.fn()
const mockStage = vi.fn()
const mockCommit = vi.fn()
const mockSetCommitMessage = vi.fn()

const defaultGitState = {
  files: [], diff: '', selectedFile: null, isLoading: false,
  commitMessage: '', error: null,
  refresh: mockRefresh, selectFile: mockSelectFile,
  stage: mockStage, commit: mockCommit, setCommitMessage: mockSetCommitMessage
}

vi.mock('@renderer/hooks/useGit', () => ({
  useGit: vi.fn(() => defaultGitState)
}))

import { useGit } from '@renderer/hooks/useGit'
const mockUseGit = vi.mocked(useGit)

beforeEach(() => {
  mockRefresh.mockClear()
  mockSelectFile.mockClear()
  mockStage.mockClear()
  mockCommit.mockClear()
  mockSetCommitMessage.mockClear()
  mockUseGit.mockReturnValue(defaultGitState)
})

describe('ChangesView', () => {
  it('renders "No changes" when file list is empty', () => {
    render(<ChangesView rootPath="/project" />)
    expect(screen.getByText('No changes')).toBeInTheDocument()
  })

  it('renders file entries when files are present', () => {
    mockUseGit.mockReturnValue({
      ...defaultGitState,
      files: [{ path: 'src/foo.ts', status: 'M' }, { path: 'src/bar.ts', status: 'A' }]
    })
    render(<ChangesView rootPath="/project" />)
    expect(screen.getByText('foo.ts')).toBeInTheDocument()
    expect(screen.getByText('bar.ts')).toBeInTheDocument()
  })

  it('calls selectFile when a file entry is clicked', () => {
    mockUseGit.mockReturnValue({
      ...defaultGitState,
      files: [{ path: 'src/foo.ts', status: 'M' }]
    })
    render(<ChangesView rootPath="/project" />)
    fireEvent.click(screen.getByText('foo.ts'))
    expect(mockSelectFile).toHaveBeenCalledWith('src/foo.ts')
  })

  it('renders diff view when diff is non-empty', () => {
    mockUseGit.mockReturnValue({ ...defaultGitState, diff: '-old\n+new' })
    render(<ChangesView rootPath="/project" />)
    expect(screen.getByTestId('diff-view')).toBeInTheDocument()
  })

  it('calls refresh when Refresh button clicked', () => {
    render(<ChangesView rootPath="/project" />)
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('calls setCommitMessage on input change', () => {
    render(<ChangesView rootPath="/project" />)
    fireEvent.change(screen.getByPlaceholderText('Commit message...'), { target: { value: 'fix: bug' } })
    expect(mockSetCommitMessage).toHaveBeenCalledWith('fix: bug')
  })

  it('calls commit when Commit button clicked', () => {
    mockUseGit.mockReturnValue({
      ...defaultGitState,
      commitMessage: 'feat: thing',
      files: [{ path: 'src/foo.ts', status: 'M' }]
    })
    render(<ChangesView rootPath="/project" />)
    fireEvent.click(screen.getByRole('button', { name: /commit/i }))
    expect(mockCommit).toHaveBeenCalledTimes(1)
  })

  it('calls stage when Stage button is clicked for a file', () => {
    mockUseGit.mockReturnValue({
      ...defaultGitState,
      files: [{ path: 'src/foo.ts', status: 'M' }]
    })
    render(<ChangesView rootPath="/project" />)
    fireEvent.click(screen.getByRole('button', { name: /stage src\/foo\.ts/i }))
    expect(mockStage).toHaveBeenCalledWith('src/foo.ts')
  })
})
