import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostComposer from '../PostComposer'
import { ToastProvider } from '../ToastNotification'

vi.mock('../../utils/aiUtils', () => ({
  generatePost: vi.fn(),
  generatePostIdeas: vi.fn(),
  generateFromFramework: vi.fn(),
  improvePost: vi.fn(),
  rewritePost: vi.fn(),
  generateHashtags: vi.fn(),
  generateFirstComment: vi.fn(),
}))

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
    onAiResult: vi.fn(),
    onInsertHook: vi.fn(),
    onInsertEnding: vi.fn(),
    onInsertTemplate: vi.fn(),
    onFirstCommentResult: vi.fn(),
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
  it('renders the LinkedIn-style profile header', () => {
    renderComposer()
    expect(screen.getByText('New Post')).toBeInTheDocument()
    expect(screen.getByText('Anyone')).toBeInTheDocument()
  })

  it('renders the textarea with content prop', () => {
    renderComposer({ content: 'Hello world' })
    expect(screen.getByPlaceholderText(/What do you want to talk about/)).toHaveValue('Hello world')
  })

  it('renders character ring', () => {
    renderComposer({ content: 'Hello' })
    expect(screen.getByTitle('5 / 3000')).toBeInTheDocument()
  })

  it('calls onContentChange when typing', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer()

    const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
    await user.type(textarea, 'H')
    expect(props.onContentChange).toHaveBeenCalled()
  })

  it('calls onSaveDraft when content is not empty', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ content: 'My draft post' })

    await user.click(screen.getByText('Save Draft'))
    expect(props.onSaveDraft).toHaveBeenCalled()
  })

  it('does not call onSaveDraft when content is empty', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ content: '' })

    await user.click(screen.getByText('Save Draft'))
    expect(props.onSaveDraft).not.toHaveBeenCalled()
  })

  it('calls clear callbacks when Clear button is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ content: 'Something' })

    await user.click(screen.getByText('Clear'))
    expect(props.onContentChange).toHaveBeenCalledWith('')
    expect(props.onImageChange).toHaveBeenCalledWith(null)
    expect(props.onFirstCommentChange).toHaveBeenCalledWith('')
  })

  it('renders formatting buttons in toolbar', () => {
    renderComposer()
    expect(screen.getByTitle('Bold')).toBeInTheDocument()
    expect(screen.getByTitle('Italic')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet list')).toBeInTheDocument()
    expect(screen.getByTitle('Numbered list')).toBeInTheDocument()
  })

  it('renders image, comment, schedule, and AI toggle icons', () => {
    renderComposer()
    expect(screen.getByTitle('Add image')).toBeInTheDocument()
    expect(screen.getByTitle('First comment')).toBeInTheDocument()
    expect(screen.getByTitle('Schedule')).toBeInTheDocument()
    expect(screen.getByTitle('AI tools')).toBeInTheDocument()
  })

  it('toggles AI panel when AI button is clicked', async () => {
    const user = userEvent.setup()
    renderComposer()

    // Initially hidden
    expect(screen.queryByText('Generate Post')).not.toBeInTheDocument()

    // Click to show
    await user.click(screen.getByTitle('AI tools'))
    expect(screen.getByText('Generate Post')).toBeInTheDocument()

    // Click to hide
    await user.click(screen.getByTitle('AI tools'))
    expect(screen.queryByText('Generate Post')).not.toBeInTheDocument()
  })

  it('toggles first comment panel when icon is clicked', async () => {
    const user = userEvent.setup()
    renderComposer()

    // Initially hidden
    expect(screen.queryByPlaceholderText(/Add a first comment/)).not.toBeInTheDocument()

    // Click to show
    await user.click(screen.getByTitle('First comment'))
    expect(screen.getByPlaceholderText(/Add a first comment/)).toBeInTheDocument()
    expect(screen.getByText(/Links here get better reach/)).toBeInTheDocument()

    // Click to hide
    await user.click(screen.getByTitle('First comment'))
    expect(screen.queryByPlaceholderText(/Add a first comment/)).not.toBeInTheDocument()
  })

  it('toggles schedule panel when icon is clicked', async () => {
    const user = userEvent.setup()
    renderComposer()

    // Initially hidden - no date inputs
    expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument()

    // Click to show
    await user.click(screen.getByTitle('Schedule'))
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
  })

  it('calls onFirstCommentChange when typing in first comment', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer()

    await user.click(screen.getByTitle('First comment'))
    const textarea = screen.getByPlaceholderText(/Add a first comment/)
    await user.type(textarea, 'My comment')
    expect(props.onFirstCommentChange).toHaveBeenCalled()
  })

  it('auto-shows first comment panel when firstComment has content', () => {
    renderComposer({ firstComment: 'Existing comment' })
    expect(screen.getByPlaceholderText(/Add a first comment/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Add a first comment/)).toHaveValue('Existing comment')
  })

  it('shows undo button in toolbar when canUndo is true', () => {
    renderComposer({ canUndo: true })
    expect(screen.getByTitle('Undo')).toBeInTheDocument()
  })

  it('does not show undo when canUndo is false', () => {
    renderComposer({ canUndo: false })
    expect(screen.queryByTitle('Undo')).not.toBeInTheDocument()
  })

  it('calls onUndo when undo button is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderComposer({ canUndo: true })

    await user.click(screen.getByTitle('Undo'))
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
    expect(screen.getByPlaceholderText(/What do you want to talk about/)).toBeDisabled()
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

  it('shows warning character count when near limit', () => {
    const longContent = 'a'.repeat(2750)
    renderComposer({ content: longContent })
    expect(screen.getByTitle(`${longContent.length} / 3000`)).toBeInTheDocument()
    // Should show remaining count when > 90%
    expect(screen.getByText(`${3000 - longContent.length}`)).toBeInTheDocument()
  })
})
