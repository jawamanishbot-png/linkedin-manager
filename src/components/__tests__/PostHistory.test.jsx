import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostHistory from '../PostHistory'

vi.mock('../../utils/linkedinApi', () => ({
  getLinkedInPosts: vi.fn(),
}))

describe('PostHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows connect prompt when not connected', () => {
    render(<PostHistory linkedInConnected={false} />)
    expect(screen.getByText('LinkedIn Post History', { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/Connect your LinkedIn account/)).toBeInTheDocument()
  })

  it('shows loading state when connected', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockReturnValue(new Promise(() => {})) // never resolves
    render(<PostHistory linkedInConnected={true} />)
    expect(screen.getByText(/Loading your LinkedIn posts/)).toBeInTheDocument()
  })

  it('displays posts after fetching', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockResolvedValue({
      posts: [
        {
          id: 'urn:li:share:123',
          text: 'My first LinkedIn post about technology',
          visibility: 'PUBLIC',
          createdAt: 1700000000000,
          lastModifiedAt: 1700000000000,
          lifecycleState: 'PUBLISHED',
          hasMedia: false,
        },
        {
          id: 'urn:li:share:456',
          text: 'Another post with media content',
          visibility: 'CONNECTIONS',
          createdAt: 1699900000000,
          lastModifiedAt: 1699900000000,
          lifecycleState: 'PUBLISHED',
          hasMedia: true,
        },
      ],
      paging: { start: 0, count: 10, total: 2 },
    })

    render(<PostHistory linkedInConnected={true} />)

    expect(await screen.findByText(/My first LinkedIn post/)).toBeInTheDocument()
    expect(screen.getByText(/Another post with media/)).toBeInTheDocument()
    expect(screen.getByText('Has media')).toBeInTheDocument()
    expect(screen.getByText('PUBLIC')).toBeInTheDocument()
    expect(screen.getByText('CONNECTIONS')).toBeInTheDocument()
  })

  it('truncates long post text at 200 characters', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    const longText = 'A'.repeat(250)
    getLinkedInPosts.mockResolvedValue({
      posts: [
        {
          id: 'urn:li:share:789',
          text: longText,
          visibility: 'PUBLIC',
          createdAt: 1700000000000,
          lastModifiedAt: 1700000000000,
          lifecycleState: 'PUBLISHED',
          hasMedia: false,
        },
      ],
      paging: { start: 0, count: 10, total: 1 },
    })

    render(<PostHistory linkedInConnected={true} />)

    const postText = await screen.findByText(/A{10,}\.\.\./)
    expect(postText.textContent).toHaveLength(203) // 200 chars + '...'
  })

  it('shows error message on API failure', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockRejectedValue(new Error('Network error'))

    render(<PostHistory linkedInConnected={true} />)

    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('shows scope-specific error for permission issues', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockRejectedValue(
      new Error('Your LinkedIn app does not have permission to read posts. The r_member_social scope is required.')
    )

    render(<PostHistory linkedInConnected={true} />)

    expect(await screen.findByText('Permission not available')).toBeInTheDocument()
    expect(screen.getByText('r_member_social')).toBeInTheDocument()
  })

  it('shows empty state when no posts found', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockResolvedValue({
      posts: [],
      paging: { start: 0, count: 10, total: 0 },
    })

    render(<PostHistory linkedInConnected={true} />)

    expect(await screen.findByText(/No posts found/)).toBeInTheDocument()
  })

  it('shows Load More button when there are more posts', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    const posts = Array.from({ length: 10 }, (_, i) => ({
      id: `urn:li:share:${i}`,
      text: `Post number ${i}`,
      visibility: 'PUBLIC',
      createdAt: 1700000000000 - i * 100000,
      lastModifiedAt: 1700000000000 - i * 100000,
      lifecycleState: 'PUBLISHED',
      hasMedia: false,
    }))
    getLinkedInPosts.mockResolvedValue({
      posts,
      paging: { start: 0, count: 10, total: 25 },
    })

    render(<PostHistory linkedInConnected={true} />)

    expect(await screen.findByText('Load More')).toBeInTheDocument()
  })

  it('loads more posts when Load More is clicked', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    const firstPage = Array.from({ length: 10 }, (_, i) => ({
      id: `urn:li:share:${i}`,
      text: `First page post ${i}`,
      visibility: 'PUBLIC',
      createdAt: 1700000000000 - i * 100000,
      lastModifiedAt: 1700000000000 - i * 100000,
      lifecycleState: 'PUBLISHED',
      hasMedia: false,
    }))
    const secondPage = [
      {
        id: 'urn:li:share:extra',
        text: 'Second page post',
        visibility: 'PUBLIC',
        createdAt: 1699000000000,
        lastModifiedAt: 1699000000000,
        lifecycleState: 'PUBLISHED',
        hasMedia: false,
      },
    ]

    getLinkedInPosts
      .mockResolvedValueOnce({ posts: firstPage, paging: { start: 0, count: 10, total: 11 } })
      .mockResolvedValueOnce({ posts: secondPage, paging: { start: 10, count: 10, total: 11 } })

    const user = userEvent.setup()
    render(<PostHistory linkedInConnected={true} />)

    await screen.findByText('Load More')
    await user.click(screen.getByText('Load More'))

    expect(await screen.findByText('Second page post')).toBeInTheDocument()
    expect(getLinkedInPosts).toHaveBeenCalledTimes(2)
    expect(getLinkedInPosts).toHaveBeenLastCalledWith(10, 10)
  })

  it('shows Refresh button after posts are loaded', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockResolvedValue({
      posts: [
        {
          id: 'urn:li:share:1',
          text: 'A post',
          visibility: 'PUBLIC',
          createdAt: 1700000000000,
          lastModifiedAt: 1700000000000,
          lifecycleState: 'PUBLISHED',
          hasMedia: false,
        },
      ],
      paging: { start: 0, count: 10, total: 1 },
    })

    render(<PostHistory linkedInConnected={true} />)

    expect(await screen.findByText('Refresh')).toBeInTheDocument()
  })

  it('dismisses error when Dismiss is clicked', async () => {
    const { getLinkedInPosts } = await import('../../utils/linkedinApi')
    getLinkedInPosts.mockRejectedValue(new Error('Something went wrong'))

    const user = userEvent.setup()
    render(<PostHistory linkedInConnected={true} />)

    await screen.findByText('Something went wrong')
    await user.click(screen.getByText('Dismiss'))

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
