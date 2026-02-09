import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ViralFrameworks from '../ViralFrameworks'

vi.mock('../../utils/aiUtils', () => ({
  generateFromFramework: vi.fn(),
}))

describe('ViralFrameworks', () => {
  const defaultProps = {
    onContentUpdate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders collapsed toggle button by default', () => {
    render(<ViralFrameworks {...defaultProps} />)
    expect(screen.getByText(/Viral Post Frameworks/)).toBeInTheDocument()
    expect(screen.queryByText('Trending Topics', { exact: false })).not.toBeInTheDocument()
  })

  it('expands when toggle is clicked and shows all 10 framework chips', async () => {
    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))

    expect(screen.getByText(/Trending Topics/)).toBeInTheDocument()
    expect(screen.getByText(/Contrarian Take/)).toBeInTheDocument()
    expect(screen.getByText(/Personal Story/)).toBeInTheDocument()
    expect(screen.getByText(/Data Insights/)).toBeInTheDocument()
    expect(screen.getByText(/Listicle/)).toBeInTheDocument()
    expect(screen.getByText(/Pattern Interrupt/)).toBeInTheDocument()
    expect(screen.getByText(/Discussion Starter/)).toBeInTheDocument()
    expect(screen.getByText(/Carousel Outline/)).toBeInTheDocument()
    expect(screen.getByText(/Repurpose Content/)).toBeInTheDocument()
    expect(screen.getByText(/Behind the Scenes/)).toBeInTheDocument()
  })

  it('shows description and input when a framework chip is clicked', async () => {
    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Contrarian Take/))

    expect(screen.getByText(/Challenge conventional wisdom/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/common belief/)).toBeInTheDocument()
    expect(screen.getByText('Generate Post')).toBeInTheDocument()
  })

  it('shows context-specific placeholder for each framework', async () => {
    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Personal Story/))
    expect(screen.getByPlaceholderText(/experience or lesson/)).toBeInTheDocument()

    await user.click(screen.getByText(/Data Insights/))
    expect(screen.getByPlaceholderText(/data or finding/)).toBeInTheDocument()
  })

  it('disables Generate button when input is empty', async () => {
    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Listicle/))

    expect(screen.getByText('Generate Post')).toBeDisabled()
  })

  it('enables Generate button when input has text', async () => {
    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Listicle/))
    await user.type(screen.getByPlaceholderText(/What topic/), 'productivity')

    expect(screen.getByText('Generate Post')).not.toBeDisabled()
  })

  it('calls generateFromFramework and onContentUpdate on generate', async () => {
    const { generateFromFramework } = await import('../../utils/aiUtils')
    generateFromFramework.mockResolvedValue('Generated viral post content')

    const onContentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<ViralFrameworks onContentUpdate={onContentUpdate} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Trending Topics/))
    await user.type(screen.getByPlaceholderText(/niche or industry/), 'AI startups')
    await user.click(screen.getByText('Generate Post'))

    expect(generateFromFramework).toHaveBeenCalledTimes(1)
    expect(generateFromFramework.mock.calls[0][0]).toBe('AI startups')
    expect(generateFromFramework.mock.calls[0][1]).toContain('trend')

    expect(await screen.findByText(/Viral Post Frameworks/)).toBeInTheDocument()
    expect(onContentUpdate).toHaveBeenCalledWith('Generated viral post content')
  })

  it('shows loading state during generation', async () => {
    const { generateFromFramework } = await import('../../utils/aiUtils')
    generateFromFramework.mockReturnValue(new Promise(() => {})) // never resolves

    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Contrarian Take/))
    await user.type(screen.getByPlaceholderText(/common belief/), 'hustle culture')
    await user.click(screen.getByText('Generate Post'))

    expect(screen.getByText(/Generating Contrarian Take post/)).toBeInTheDocument()
  })

  it('shows error message on API failure', async () => {
    const { generateFromFramework } = await import('../../utils/aiUtils')
    generateFromFramework.mockRejectedValue(new Error('API key invalid'))

    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Personal Story/))
    await user.type(screen.getByPlaceholderText(/experience or lesson/), 'career pivot')
    await user.click(screen.getByText('Generate Post'))

    expect(await screen.findByText('API key invalid')).toBeInTheDocument()
  })

  it('dismisses error when X is clicked', async () => {
    const { generateFromFramework } = await import('../../utils/aiUtils')
    generateFromFramework.mockRejectedValue(new Error('Something failed'))

    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Listicle/))
    await user.type(screen.getByPlaceholderText(/What topic/), 'testing')
    await user.click(screen.getByText('Generate Post'))

    await screen.findByText('Something failed')

    // Click the dismiss button (✕ inside the error)
    const errorDiv = screen.getByText('Something failed').closest('.frameworks-error')
    await user.click(errorDiv.querySelector('button'))

    expect(screen.queryByText('Something failed')).not.toBeInTheDocument()
  })

  it('collapses and resets state when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<ViralFrameworks {...defaultProps} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Data Insights/))
    await user.type(screen.getByPlaceholderText(/data or finding/), 'some stat')

    // Click close
    await user.click(screen.getByText('✕'))

    // Should be collapsed again
    expect(screen.getByText(/Viral Post Frameworks — 10 AI-powered/)).toBeInTheDocument()
    expect(screen.queryByText(/Data Insights/)).not.toBeInTheDocument()
  })

  it('triggers generate on Enter key in input', async () => {
    const { generateFromFramework } = await import('../../utils/aiUtils')
    generateFromFramework.mockResolvedValue('Enter-generated post')

    const onContentUpdate = vi.fn()
    const user = userEvent.setup()
    render(<ViralFrameworks onContentUpdate={onContentUpdate} />)

    await user.click(screen.getByText(/Viral Post Frameworks/))
    await user.click(screen.getByText(/Behind the Scenes/))
    const input = screen.getByPlaceholderText(/What to reveal/)
    await user.type(input, 'hiring process{Enter}')

    expect(generateFromFramework).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/Viral Post Frameworks/)).toBeInTheDocument()
    expect(onContentUpdate).toHaveBeenCalledWith('Enter-generated post')
  })
})
