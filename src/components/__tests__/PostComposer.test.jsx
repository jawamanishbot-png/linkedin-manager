import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostComposer from '../PostComposer'

// Mock aiUtils to prevent import errors in AiAssistant
vi.mock('../../utils/aiUtils', () => ({
  generatePost: vi.fn(),
  generateHashtags: vi.fn(),
  rewritePost: vi.fn(),
  improvePost: vi.fn(),
  generatePostIdeas: vi.fn(),
  generateFirstComment: vi.fn(),
}))

// Mock alert
globalThis.alert = vi.fn()

describe('PostComposer', () => {
  const defaultProps = {
    onSaveDraft: vi.fn(),
    onSchedule: vi.fn(),
    onContentChange: vi.fn(),
    onImageChange: vi.fn(),
    onFirstCommentChange: vi.fn(),
    aiEnabled: false,
  }

  const renderComposer = (overrides = {}) => {
    const props = { ...defaultProps, ...overrides }
    // Reset mocks
    Object.values(props).forEach((fn) => { if (typeof fn === 'function') fn.mockClear?.() })
    return render(<PostComposer {...props} />)
  }

  it('renders the compose heading', () => {
    renderComposer()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Compose New Post')
  })

  it('renders the textarea', () => {
    renderComposer()
    expect(screen.getByPlaceholderText(/What's on your mind/)).toBeInTheDocument()
  })

  it('renders the first comment textarea', () => {
    renderComposer()
    expect(screen.getByPlaceholderText(/Add a first comment/)).toBeInTheDocument()
  })

  it('renders character counter starting at 0', () => {
    renderComposer()
    expect(screen.getByText('0 / 3000 characters')).toBeInTheDocument()
  })

  it('updates character count as user types', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'Hello')
    expect(screen.getByText('5 / 3000 characters')).toBeInTheDocument()
  })

  it('calls onContentChange when typing in main textarea', async () => {
    const user = userEvent.setup()
    const onContentChange = vi.fn()
    renderComposer({ onContentChange })

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'Hi')
    expect(onContentChange).toHaveBeenCalled()
  })

  it('calls onFirstCommentChange when typing in first comment', async () => {
    const user = userEvent.setup()
    const onFirstCommentChange = vi.fn()
    renderComposer({ onFirstCommentChange })

    const textarea = screen.getByPlaceholderText(/Add a first comment/)
    await user.type(textarea, 'My comment')
    expect(onFirstCommentChange).toHaveBeenCalled()
  })

  it('shows alert when saving draft with empty content', async () => {
    const user = userEvent.setup()
    renderComposer()

    await user.click(screen.getByText(/Save as Draft/))
    expect(globalThis.alert).toHaveBeenCalledWith('Please write something first!')
  })

  it('calls onSaveDraft with content, image, and firstComment', async () => {
    const user = userEvent.setup()
    const onSaveDraft = vi.fn()
    renderComposer({ onSaveDraft })

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'My draft post')

    const firstComment = screen.getByPlaceholderText(/Add a first comment/)
    await user.type(firstComment, 'Link here')

    await user.click(screen.getByText(/Save as Draft/))
    expect(onSaveDraft).toHaveBeenCalledWith('My draft post', null, 'Link here')
  })

  it('clears form after saving draft', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'Draft content')
    await user.click(screen.getByText(/Save as Draft/))

    expect(textarea).toHaveValue('')
    expect(screen.getByText('0 / 3000 characters')).toBeInTheDocument()
  })

  it('shows alert when scheduling without date', async () => {
    const user = userEvent.setup()
    renderComposer()

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'Scheduled post')
    await user.click(screen.getByRole('button', { name: /Schedule Post/ }))

    expect(globalThis.alert).toHaveBeenCalledWith('Please pick a date!')
  })

  it('clears form with Clear button', async () => {
    const user = userEvent.setup()
    const onContentChange = vi.fn()
    const onImageChange = vi.fn()
    const onFirstCommentChange = vi.fn()
    renderComposer({ onContentChange, onImageChange, onFirstCommentChange })

    const textarea = screen.getByPlaceholderText(/What's on your mind/)
    await user.type(textarea, 'Something')

    await user.click(screen.getByText(/Clear/))
    expect(textarea).toHaveValue('')
    expect(onContentChange).toHaveBeenLastCalledWith('')
    expect(onImageChange).toHaveBeenLastCalledWith(null)
    expect(onFirstCommentChange).toHaveBeenLastCalledWith('')
  })

  it('renders the formatting toolbar', () => {
    renderComposer()
    expect(screen.getByTitle('Bold (select text first)')).toBeInTheDocument()
  })

  it('renders the hook templates toggle', () => {
    renderComposer()
    expect(screen.getByText('Hook & CTA Templates')).toBeInTheDocument()
  })

  it('renders schedule section with date and time inputs', () => {
    renderComposer()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
  })

  it('shows first comment section with hint text', () => {
    renderComposer()
    expect(screen.getByText(/Links in the first comment/)).toBeInTheDocument()
  })

  it('does not render AI assistant when aiEnabled is false', () => {
    renderComposer({ aiEnabled: false })
    expect(screen.queryByText(/AI Assistant/)).not.toBeInTheDocument()
  })

  it('renders AI assistant toggle when aiEnabled is true', () => {
    renderComposer({ aiEnabled: true })
    expect(screen.getByText(/AI Assistant/)).toBeInTheDocument()
  })
})
