import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AiOutputPreview from '../AiOutputPreview'

describe('AiOutputPreview', () => {
  const defaultProps = {
    originalContent: 'Original text',
    aiContent: 'AI generated content here',
    actionLabel: 'Generated Post',
    onAccept: vi.fn(),
    onDiscard: vi.fn(),
    onRetry: vi.fn(),
    isRetrying: false,
  }

  it('renders the action label', () => {
    render(<AiOutputPreview {...defaultProps} />)
    expect(screen.getByText('Generated Post')).toBeInTheDocument()
  })

  it('renders the AI content', () => {
    render(<AiOutputPreview {...defaultProps} />)
    expect(screen.getByText('AI generated content here')).toBeInTheDocument()
  })

  it('renders Accept and Discard buttons', () => {
    render(<AiOutputPreview {...defaultProps} />)
    expect(screen.getByText('Accept Changes')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('renders Retry button', () => {
    render(<AiOutputPreview {...defaultProps} />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('shows "Start Over" instead of "Discard" when no original content', () => {
    render(<AiOutputPreview {...defaultProps} originalContent="" />)
    expect(screen.getByText('Start Over')).toBeInTheDocument()
    expect(screen.queryByText('Discard')).not.toBeInTheDocument()
  })

  it('calls onAccept when Accept is clicked', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn()
    render(<AiOutputPreview {...defaultProps} onAccept={onAccept} />)

    await user.click(screen.getByText('Accept Changes'))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('calls onDiscard when Discard is clicked', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<AiOutputPreview {...defaultProps} onDiscard={onDiscard} />)

    await user.click(screen.getByText('Discard'))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('calls onRetry when Retry is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<AiOutputPreview {...defaultProps} onRetry={onRetry} />)

    await user.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows "Retrying..." and disables retry button when isRetrying', () => {
    render(<AiOutputPreview {...defaultProps} isRetrying={true} />)
    const retryBtn = screen.getByText('Retrying...')
    expect(retryBtn).toBeDisabled()
  })

  it('dismisses on Escape key', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<AiOutputPreview {...defaultProps} onDiscard={onDiscard} />)

    await user.keyboard('{Escape}')
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })
})
