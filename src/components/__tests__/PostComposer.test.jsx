import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostComposer from '../PostComposer'
import { ToastProvider } from '../ToastNotification'

const renderComposer = (overrides = {}) => {
  const props = {
    content: '',
    image: null,
    firstComment: '',
    onContentChange: vi.fn(),
    onImageChange: vi.fn(),
    onFirstCommentChange: vi.fn(),
    onSaveDraft: vi.fn(),
    onSchedule: vi.fn(),
    aiPreview: null,
    onAcceptAi: vi.fn(),
    onDiscardAi: vi.fn(),
    onRetryAi: vi.fn(),
    isRetrying: false,
    canUndo: false,
    onUndo: vi.fn(),
    ...overrides,
  }
  const result = render(
    <ToastProvider>
      <PostComposer {...props} />
    </ToastProvider>
  )
  return { ...result, props }
}

describe('PostComposer', () => {
  it('renders the compose heading', () => {
    renderComposer()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Compose New Post')
  })

  it('renders the textarea with content prop', () => {
    renderComposer({ content: 'Hello world' })
    expect(screen.getByPlaceholderText(/What's on your mind/)).toHaveValue('Hello world')
  })

  it('renders the first comment textarea', () => {
    renderComposer()
    expect(screen.getByPlaceholderText(/Add a first comment/)).toBeInTheDocument()
  })

  it('shows character count based on content length', () => {
    renderComposer({ content: 'Hello' })
    expect(screen.getByText('5 / 3000 characters')).toBeInTheDocument()
  })

  it('shows 0 characters when content is empty', () => {
    renderComposer()
    expect(screen.getByText('0 / 3000 characters')).toBeInTheDocument()
  })

  it('calls onContentChange when typing in main textarea', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer()

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'H')
    expect(props.onContentChange).toHaveBeenCalled()
  })

  it('calls onFirstCommentChange when typing in first comment', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer()

    const textarea = screen.getByPlaceholderText(/Add a first comment/)
    await user.type(textarea, 'My comment')
    expect(props.onFirstCommentChange).toHaveBeenCalled()
  })

  it('calls onSaveDraft when content is not empty', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ content: 'My draft post' })

    await user.click(screen.getByText(/Save as Draft/))
    expect(props.onSaveDraft).toHaveBeenCalled()
  })

  it('does not call onSaveDraft when content is empty', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ content: '' })

    await user.click(screen.getByText(/Save as Draft/))
    expect(props.onSaveDraft).not.toHaveBeenCalled()
  })

  it('calls clear callbacks when Clear button is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ content: 'Something' })

    await user.click(screen.getByText(/Clear/))
    expect(props.onContentChange).toHaveBeenCalledWith('')
    expect(props.onImageChange).toHaveBeenCalledWith(null)
    expect(props.onFirstCommentChange).toHaveBeenCalledWith('')
  })

  it('renders the formatting toolbar', () => {
    renderComposer()
    expect(screen.getByTitle('Bold (select text first)')).toBeInTheDocument()
  })

  it('renders schedule section with date and time inputs', () => {
    renderComposer()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schedule Post' })).toBeInTheDocument()
  })

  it('shows first comment section with hint text', () => {
    renderComposer()
    expect(screen.getByText(/Links in the first comment/)).toBeInTheDocument()
  })

  it('shows undo button when canUndo is true', () => {
    renderComposer({ canUndo: true })
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  it('does not show undo button when canUndo is false', () => {
    renderComposer({ canUndo: false })
    expect(screen.queryByText('Undo')).not.toBeInTheDocument()
  })

  it('calls onUndo when undo button is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ canUndo: true })

    await user.click(screen.getByText('Undo'))
    expect(props.onUndo).toHaveBeenCalled()
  })

  it('shows AI output preview when aiPreview is set', () => {
    renderComposer({
      content: 'Original',
      aiPreview: { content: 'AI generated text', label: 'Generated Post' },
    })
    expect(screen.getByText('Generated Post')).toBeInTheDocument()
    expect(screen.getByText('AI generated text')).toBeInTheDocument()
    expect(screen.getByText('Accept Changes')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('disables textarea when aiPreview is active', () => {
    renderComposer({
      content: 'Original',
      aiPreview: { content: 'AI text', label: 'Test' },
    })
    expect(screen.getByPlaceholderText(/What's on your mind/)).toBeDisabled()
  })

  it('calls onAcceptAi when Accept is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({
      content: 'Original',
      aiPreview: { content: 'AI text', label: 'Test' },
    })

    await user.click(screen.getByText('Accept Changes'))
    expect(props.onAcceptAi).toHaveBeenCalled()
  })

  it('calls onDiscardAi when Discard is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({
      content: 'Original',
      aiPreview: { content: 'AI text', label: 'Test' },
    })

    await user.click(screen.getByText('Discard'))
    expect(props.onDiscardAi).toHaveBeenCalled()
  })
})
