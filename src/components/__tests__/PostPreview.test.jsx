import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostPreview from '../PostPreview'

describe('PostPreview', () => {
  it('shows empty state when no content', () => {
    render(<PostPreview content="" image={null} />)
    expect(screen.getByText('Start typing to see your post preview')).toBeInTheDocument()
  })

  it('shows empty state when content is whitespace', () => {
    render(<PostPreview content="   " image={null} />)
    expect(screen.getByText('Start typing to see your post preview')).toBeInTheDocument()
  })

  it('shows empty state when content is null', () => {
    render(<PostPreview content={null} image={null} />)
    expect(screen.getByText('Start typing to see your post preview')).toBeInTheDocument()
  })

  it('renders preview header', () => {
    render(<PostPreview content="Hello" image={null} />)
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('shows Desktop and Mobile toggle buttons', () => {
    render(<PostPreview content="Hello" image={null} />)
    expect(screen.getByText('Desktop')).toBeInTheDocument()
    expect(screen.getByText('Mobile')).toBeInTheDocument()
  })

  it('renders author info', () => {
    render(<PostPreview content="Hello" image={null} />)
    expect(screen.getByText('Your Name')).toBeInTheDocument()
    expect(screen.getByText('Your headline')).toBeInTheDocument()
  })

  it('renders engagement bar', () => {
    render(<PostPreview content="Hello" image={null} />)
    expect(screen.getByText('Like')).toBeInTheDocument()
    expect(screen.getByText('Comment')).toBeInTheDocument()
    expect(screen.getByText('Repost')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
  })

  it('shows short content without truncation', () => {
    render(<PostPreview content="Short post" image={null} />)
    expect(screen.getByText('Short post')).toBeInTheDocument()
    expect(screen.queryByText('...see more')).not.toBeInTheDocument()
  })

  it('truncates long content on desktop at ~210 chars', () => {
    const longContent = 'A'.repeat(300)
    render(<PostPreview content={longContent} image={null} />)
    expect(screen.getByText('...see more')).toBeInTheDocument()
  })

  it('shows "see more" button that expands text', async () => {
    const user = userEvent.setup()
    const longContent = 'A'.repeat(300)
    render(<PostPreview content={longContent} image={null} />)

    await user.click(screen.getByText('...see more'))
    expect(screen.getByText('show less')).toBeInTheDocument()
    expect(screen.getByText(longContent)).toBeInTheDocument()
  })

  it('shows "show less" button that collapses text', async () => {
    const user = userEvent.setup()
    const longContent = 'A'.repeat(300)
    render(<PostPreview content={longContent} image={null} />)

    await user.click(screen.getByText('...see more'))
    await user.click(screen.getByText('show less'))
    expect(screen.getByText('...see more')).toBeInTheDocument()
  })

  it('truncates at shorter threshold on mobile', async () => {
    const user = userEvent.setup()
    // 150 chars is between mobile threshold (140) and desktop threshold (210)
    const content = 'A'.repeat(150)
    render(<PostPreview content={content} image={null} />)

    // Desktop: should not truncate at 150 chars
    expect(screen.queryByText('...see more')).not.toBeInTheDocument()

    // Switch to mobile
    await user.click(screen.getByText('Mobile'))
    expect(screen.getByText('...see more')).toBeInTheDocument()
  })

  it('shows truncation indicator with character count', () => {
    const content = 'A'.repeat(300)
    render(<PostPreview content={content} image={null} />)
    expect(screen.getByText(/90 chars hidden/)).toBeInTheDocument()
  })

  it('renders image when provided', () => {
    render(<PostPreview content="With image" image="data:image/png;base64,abc" />)
    const img = screen.getByAltText('Post')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc')
  })

  it('does not render image when not provided', () => {
    render(<PostPreview content="No image" image={null} />)
    expect(screen.queryByAltText('Post')).not.toBeInTheDocument()
  })

  it('resets expansion when switching device', async () => {
    const user = userEvent.setup()
    const longContent = 'A'.repeat(300)
    render(<PostPreview content={longContent} image={null} />)

    // Expand
    await user.click(screen.getByText('...see more'))
    expect(screen.getByText('show less')).toBeInTheDocument()

    // Switch to mobile — should reset expansion
    await user.click(screen.getByText('Mobile'))
    expect(screen.getByText('...see more')).toBeInTheDocument()
  })
})
