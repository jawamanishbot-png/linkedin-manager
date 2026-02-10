import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AiPanel from '../AiPanel'

vi.mock('../../utils/aiUtils', () => ({
  generatePost: vi.fn(),
  generatePostIdeas: vi.fn(),
  generateFromFramework: vi.fn(),
  improvePost: vi.fn(),
  rewritePost: vi.fn(),
  generateHashtags: vi.fn(),
  generateFirstComment: vi.fn(),
}))

describe('AiPanel', () => {
  const defaultProps = {
    content: '',
    onAiResult: vi.fn(),
    onInsertHook: vi.fn(),
    onInsertEnding: vi.fn(),
    onInsertTemplate: vi.fn(),
    onFirstCommentResult: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with 3 tabs', () => {
    render(<AiPanel {...defaultProps} />)
    expect(screen.getByText('Generate')).toBeInTheDocument()
    expect(screen.getByText('Refine')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
  })

  it('shows Generate tab content by default', () => {
    render(<AiPanel {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Enter a topic/)).toBeInTheDocument()
    expect(screen.getByText('Generate Post')).toBeInTheDocument()
  })

  it('shows all 10 framework chips in Generate tab', () => {
    render(<AiPanel {...defaultProps} />)
    expect(screen.getByText('Contrarian Take')).toBeInTheDocument()
    expect(screen.getByText('Personal Story')).toBeInTheDocument()
    expect(screen.getByText('Data Insights')).toBeInTheDocument()
    expect(screen.getByText('Listicle')).toBeInTheDocument()
    expect(screen.getByText('Discussion Starter')).toBeInTheDocument()
    expect(screen.getByText('Behind the Scenes')).toBeInTheDocument()
    expect(screen.getByText('Trending Topics')).toBeInTheDocument()
    expect(screen.getByText('Pattern Interrupt')).toBeInTheDocument()
    expect(screen.getByText('Carousel Outline')).toBeInTheDocument()
    expect(screen.getByText('Repurpose Content')).toBeInTheDocument()
  })

  it('shows framework detail when a chip is clicked', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} />)

    await user.click(screen.getByText('Contrarian Take'))
    expect(screen.getByText(/Challenge conventional wisdom/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/common belief/)).toBeInTheDocument()
  })

  it('shows "Use Template" button for frameworks with templates', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} />)

    await user.click(screen.getByText('Contrarian Take'))
    expect(screen.getByText('Use Template')).toBeInTheDocument()
  })

  it('does not show "Use Template" for AI-only frameworks', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} />)

    await user.click(screen.getByText('Trending Topics'))
    expect(screen.queryByText('Use Template')).not.toBeInTheDocument()
  })

  it('calls onInsertTemplate when Use Template is clicked', async () => {
    const user = userEvent.setup()
    const onInsertTemplate = vi.fn()
    render(<AiPanel {...defaultProps} onInsertTemplate={onInsertTemplate} />)

    await user.click(screen.getByText('Contrarian Take'))
    await user.click(screen.getByText('Use Template'))
    expect(onInsertTemplate).toHaveBeenCalledTimes(1)
    expect(onInsertTemplate.mock.calls[0][0]).toContain('Unpopular opinion')
  })

  it('switches to Refine tab and shows actions', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} content="Some content" />)

    await user.click(screen.getByText('Refine'))
    expect(screen.getByText('Improve Post')).toBeInTheDocument()
    expect(screen.getByText('Make it Punchier')).toBeInTheDocument()
    expect(screen.getByText('Shorten')).toBeInTheDocument()
    expect(screen.getByText('Add a Hook')).toBeInTheDocument()
  })

  it('shows empty hint in Refine tab when no content', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} content="" />)

    await user.click(screen.getByText('Refine'))
    expect(screen.getByText(/Write some content first/)).toBeInTheDocument()
  })

  it('disables refine actions when content is empty', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} content="" />)

    await user.click(screen.getByText('Refine'))
    expect(screen.getByText('Improve Post')).toBeDisabled()
    expect(screen.getByText('Make it Punchier')).toBeDisabled()
  })

  it('shows tone options in Refine tab', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} content="Post" />)

    await user.click(screen.getByText('Refine'))
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.getByText('Casual')).toBeInTheDocument()
    expect(screen.getByText('Inspirational')).toBeInTheDocument()
  })

  it('switches to Templates tab and shows categories', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} />)

    await user.click(screen.getByText('Templates'))
    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.getByText('Curiosity')).toBeInTheDocument()
    expect(screen.getByText('Contrarian')).toBeInTheDocument()
    expect(screen.getByText('Listicle')).toBeInTheDocument()
    expect(screen.getByText('Question')).toBeInTheDocument()
  })

  it('shows hook templates when a category is selected', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} />)

    await user.click(screen.getByText('Templates'))
    // Story is default category
    expect(screen.getByText(/I made a mistake/)).toBeInTheDocument()
  })

  it('calls onInsertHook when a hook template is clicked', async () => {
    const user = userEvent.setup()
    const onInsertHook = vi.fn()
    render(<AiPanel {...defaultProps} onInsertHook={onInsertHook} />)

    await user.click(screen.getByText('Templates'))
    await user.click(screen.getByText(/I made a mistake/))
    expect(onInsertHook).toHaveBeenCalledWith('I made a mistake that cost me everything.')
  })

  it('shows endings in Templates tab', async () => {
    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} />)

    await user.click(screen.getByText('Templates'))
    expect(screen.getByText(/What do you think/)).toBeInTheDocument()
    expect(screen.getByText(/Agree or disagree/)).toBeInTheDocument()
  })

  it('calls onInsertEnding when an ending is clicked', async () => {
    const user = userEvent.setup()
    const onInsertEnding = vi.fn()
    render(<AiPanel {...defaultProps} onInsertEnding={onInsertEnding} />)

    await user.click(screen.getByText('Templates'))
    await user.click(screen.getByText(/What do you think/))
    expect(onInsertEnding).toHaveBeenCalledWith('What do you think? Drop your thoughts below.')
  })

  it('calls generateFromFramework when generating with a framework', async () => {
    const { generateFromFramework } = await import('../../utils/aiUtils')
    generateFromFramework.mockResolvedValue('AI generated post')

    const user = userEvent.setup()
    const onAiResult = vi.fn()
    render(<AiPanel {...defaultProps} onAiResult={onAiResult} />)

    await user.click(screen.getByText('Contrarian Take'))
    const input = screen.getByPlaceholderText(/common belief/)
    await user.type(input, 'hustle culture')
    await user.click(screen.getByText('Generate with AI'))

    await vi.waitFor(() => expect(generateFromFramework).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(onAiResult).toHaveBeenCalledTimes(1))
    expect(onAiResult.mock.calls[0][0]).toBe('AI generated post')
    expect(onAiResult.mock.calls[0][1]).toContain('Contrarian Take')
  })

  it('calls improvePost from Refine tab', async () => {
    const { improvePost } = await import('../../utils/aiUtils')
    improvePost.mockResolvedValue('Improved content')

    const user = userEvent.setup()
    const onAiResult = vi.fn()
    render(<AiPanel {...defaultProps} content="Draft post" onAiResult={onAiResult} />)

    await user.click(screen.getByText('Refine'))
    await user.click(screen.getByText('Improve Post'))

    await vi.waitFor(() => expect(improvePost).toHaveBeenCalledWith('Draft post'))
    await vi.waitFor(() => expect(onAiResult).toHaveBeenCalledTimes(1))
    expect(onAiResult.mock.calls[0][0]).toBe('Improved content')
  })

  it('shows error message on API failure', async () => {
    const { improvePost } = await import('../../utils/aiUtils')
    improvePost.mockRejectedValue(new Error('API error'))

    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} content="Draft" />)

    await user.click(screen.getByText('Refine'))
    await user.click(screen.getByText('Improve Post'))

    expect(await screen.findByText('API error')).toBeInTheDocument()
  })

  it('dismisses error when dismiss button is clicked', async () => {
    const { improvePost } = await import('../../utils/aiUtils')
    improvePost.mockRejectedValue(new Error('Something failed'))

    const user = userEvent.setup()
    render(<AiPanel {...defaultProps} content="Draft" />)

    await user.click(screen.getByText('Refine'))
    await user.click(screen.getByText('Improve Post'))

    await screen.findByText('Something failed')
    const errorDiv = screen.getByText('Something failed').closest('.panel-error')
    await user.click(errorDiv.querySelector('button'))

    expect(screen.queryByText('Something failed')).not.toBeInTheDocument()
  })
})
