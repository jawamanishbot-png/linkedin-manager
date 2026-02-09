import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AiAssistant from '../AiAssistant'

vi.mock('../../utils/aiUtils', () => ({
  generatePost: vi.fn(),
  generateHashtags: vi.fn(),
  rewritePost: vi.fn(),
  improvePost: vi.fn(),
  generatePostIdeas: vi.fn(),
  generateFirstComment: vi.fn(),
}))

describe('AiAssistant', () => {
  const defaultProps = {
    content: '',
    onContentUpdate: vi.fn(),
    onFirstCommentUpdate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the collapsed toggle button by default', () => {
    render(<AiAssistant {...defaultProps} />)
    expect(screen.getByText(/AI Assistant/)).toBeInTheDocument()
  })

  it('expands when toggle button is clicked', async () => {
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} />)
    await user.click(screen.getByText(/AI Assistant/))
    expect(screen.getByText('Generate Post')).toBeInTheDocument()
    expect(screen.getByText('Improve Post')).toBeInTheDocument()
    expect(screen.getByText('Rewrite Tone')).toBeInTheDocument()
    expect(screen.getByText('Add Hashtags')).toBeInTheDocument()
    expect(screen.getByText('Suggest First Comment')).toBeInTheDocument()
  })

  it('disables content-dependent buttons when content is empty', async () => {
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} content="" />)
    await user.click(screen.getByText(/AI Assistant/))
    expect(screen.getByText('Improve Post')).toBeDisabled()
    expect(screen.getByText('Rewrite Tone')).toBeDisabled()
    expect(screen.getByText('Add Hashtags')).toBeDisabled()
    expect(screen.getByText('Suggest First Comment')).toBeDisabled()
  })

  it('enables content-dependent buttons when content exists', async () => {
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} content="Some post content" />)
    await user.click(screen.getByText(/AI Assistant/))
    expect(screen.getByText('Improve Post')).not.toBeDisabled()
    expect(screen.getByText('Add Hashtags')).not.toBeDisabled()
    expect(screen.getByText('Suggest First Comment')).not.toBeDisabled()
  })

  it('shows topic input when Generate Post is clicked', async () => {
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Generate Post'))
    expect(screen.getByPlaceholderText(/Enter a topic/)).toBeInTheDocument()
  })

  it('shows tone menu when Rewrite Tone is clicked', async () => {
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} content="Some content" />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Rewrite Tone'))
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByText('Casual')).toBeInTheDocument()
    expect(screen.getByText('Inspirational')).toBeInTheDocument()
    expect(screen.getByText('Storytelling')).toBeInTheDocument()
    expect(screen.getByText('Humorous')).toBeInTheDocument()
  })

  it('collapses when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} />)
    await user.click(screen.getByText(/AI Assistant/))
    expect(screen.getByText('Generate Post')).toBeInTheDocument()
    await user.click(screen.getByText('✕'))
    expect(screen.queryByText('Generate Post')).not.toBeInTheDocument()
  })

  it('calls improvePost and onContentUpdate', async () => {
    const { improvePost } = await import('../../utils/aiUtils')
    improvePost.mockResolvedValue('Improved content')
    const onContentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<AiAssistant content="Draft" onContentUpdate={onContentUpdate} onFirstCommentUpdate={vi.fn()} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Improve Post'))
    await vi.waitFor(() => expect(improvePost).toHaveBeenCalledWith('Draft'))
    await vi.waitFor(() => expect(onContentUpdate).toHaveBeenCalledWith('Improved content'))
  })

  it('calls generateHashtags and appends to content', async () => {
    const { generateHashtags } = await import('../../utils/aiUtils')
    generateHashtags.mockResolvedValue('#ai #tech #linkedin')
    const onContentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<AiAssistant content="My post" onContentUpdate={onContentUpdate} onFirstCommentUpdate={vi.fn()} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Add Hashtags'))
    await vi.waitFor(() => expect(generateHashtags).toHaveBeenCalledWith('My post'))
    await vi.waitFor(() => expect(onContentUpdate).toHaveBeenCalledWith('My post\n\n#ai #tech #linkedin'))
  })

  it('calls generateFirstComment and updates first comment', async () => {
    const { generateFirstComment } = await import('../../utils/aiUtils')
    generateFirstComment.mockResolvedValue('Great first comment')
    const onFirstCommentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<AiAssistant content="Post" onContentUpdate={vi.fn()} onFirstCommentUpdate={onFirstCommentUpdate} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Suggest First Comment'))
    await vi.waitFor(() => expect(onFirstCommentUpdate).toHaveBeenCalledWith('Great first comment'))
  })

  it('displays error message on API failure', async () => {
    const { improvePost } = await import('../../utils/aiUtils')
    improvePost.mockRejectedValue(new Error('API key invalid'))
    const user = userEvent.setup()
    render(<AiAssistant content="Draft" onContentUpdate={vi.fn()} onFirstCommentUpdate={vi.fn()} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Improve Post'))
    expect(await screen.findByText('API key invalid')).toBeInTheDocument()
  })

  it('generates post from topic input', async () => {
    const { generatePost } = await import('../../utils/aiUtils')
    generatePost.mockResolvedValue('Generated post about AI')
    const onContentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<AiAssistant content="" onContentUpdate={onContentUpdate} onFirstCommentUpdate={vi.fn()} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Generate Post'))
    const input = screen.getByPlaceholderText(/Enter a topic/)
    await user.type(input, 'Artificial Intelligence')
    await user.click(screen.getByRole('button', { name: 'Generate' }))
    await vi.waitFor(() => expect(generatePost).toHaveBeenCalledWith('Artificial Intelligence'))
    await vi.waitFor(() => expect(onContentUpdate).toHaveBeenCalledWith('Generated post about AI'))
  })

  it('generates post ideas from topic input', async () => {
    const { generatePostIdeas } = await import('../../utils/aiUtils')
    generatePostIdeas.mockResolvedValue('1. Idea one\n2. Idea two')
    const user = userEvent.setup()
    render(<AiAssistant {...defaultProps} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Generate Post'))
    const input = screen.getByPlaceholderText(/Enter a topic/)
    await user.type(input, 'Leadership')
    await user.click(screen.getByRole('button', { name: 'Get Ideas' }))
    await vi.waitFor(() => expect(generatePostIdeas).toHaveBeenCalledWith('Leadership'))
    expect(await screen.findByText('Post Ideas')).toBeInTheDocument()
  })

  it('rewrites post in selected tone', async () => {
    const { rewritePost } = await import('../../utils/aiUtils')
    rewritePost.mockResolvedValue('Casual version of the post')
    const onContentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<AiAssistant content="Formal post" onContentUpdate={onContentUpdate} onFirstCommentUpdate={vi.fn()} />)
    await user.click(screen.getByText(/AI Assistant/))
    await user.click(screen.getByText('Rewrite Tone'))
    await user.click(screen.getByText('Casual'))
    await vi.waitFor(() => expect(rewritePost).toHaveBeenCalledWith('Formal post', 'casual'))
    await vi.waitFor(() => expect(onContentUpdate).toHaveBeenCalledWith('Casual version of the post'))
  })
})
