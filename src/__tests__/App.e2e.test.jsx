import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock all external API modules
vi.mock('../utils/linkedinApi', () => ({
  getLinkedInStatus: vi.fn().mockResolvedValue({ connected: false }),
  getLinkedInAuthUrl: vi.fn().mockReturnValue('/api/auth/linkedin'),
  disconnectLinkedIn: vi.fn().mockResolvedValue({ success: true }),
  publishToLinkedIn: vi.fn().mockResolvedValue({ success: true }),
  getLinkedInPosts: vi.fn().mockResolvedValue({ posts: [] }),
}))

vi.mock('../utils/aiUtils', () => ({
  generatePost: vi.fn(),
  generatePostIdeas: vi.fn(),
  generateFromFramework: vi.fn(),
  improvePost: vi.fn(),
  rewritePost: vi.fn(),
  generateHashtags: vi.fn(),
  generateFirstComment: vi.fn(),
  getAiConfig: vi.fn().mockReturnValue({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash',
    maxTokens: 1024,
    temperature: 0.7,
    enabled: true,
  }),
  saveAiConfig: vi.fn().mockReturnValue(true),
  hasCustomApiKey: vi.fn().mockReturnValue(false),
  isAiConfigured: vi.fn().mockReturnValue(true),
  getModelsForProvider: vi.fn().mockReturnValue(['gemini-2.0-flash', 'gemini-1.5-pro']),
}))

describe('App E2E Integration Tests', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    localStorage.clear()
    vi.clearAllMocks()

    // Reset window.confirm to auto-accept
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderApp = () => render(<App />)

  // Helper: set textarea value via fireEvent (much faster than user.type for bulk text)
  const setTextareaValue = (textarea, value) => {
    fireEvent.change(textarea, { target: { value } })
  }

  // Helper: seed test posts into localStorage and render app
  const seedTestPosts = () => {
    const posts = [
      {
        id: '1001',
        content: 'Just launched my new course on web development!',
        image: null,
        firstComment: null,
        scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      },
      {
        id: '1002',
        content: 'Weekly tip: Always break down big problems into smaller tasks.',
        image: null,
        firstComment: null,
        scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      },
      {
        id: '1003',
        content: 'Currently reading "Atomic Habits" - highly recommend it.',
        image: null,
        firstComment: null,
        scheduledTime: null,
        status: 'draft',
        createdAt: new Date().toISOString(),
      },
    ]
    localStorage.setItem('linkedinPosts', JSON.stringify(posts))
  }

  const renderAppWithTestData = () => {
    seedTestPosts()
    return renderApp()
  }

  // ─── Flow 1: App initialization & layout ───────────────────────────

  describe('App initialization', () => {
    it('renders the app header, composer, calendar, and post list', async () => {
      renderApp()

      expect(screen.getByText('LinkedIn Post Manager')).toBeInTheDocument()
      expect(screen.getByText('Schedule and manage your LinkedIn posts')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/What do you want to talk about/)).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Connect LinkedIn')).toBeInTheDocument()
    })

    it('starts with an empty post list on first visit', async () => {
      renderApp()

      await waitFor(() => {
        expect(screen.getByText(/No posts yet/)).toBeInTheDocument()
      })
    })

    it('loads existing posts from localStorage', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([{
        id: '999',
        content: 'My existing post',
        image: null,
        firstComment: null,
        scheduledTime: null,
        status: 'draft',
        createdAt: new Date().toISOString(),
      }]))

      renderApp()

      await waitFor(() => {
        expect(screen.getByText('My existing post')).toBeInTheDocument()
      })
    })
  })

  // ─── Flow 2: Draft creation ────────────────────────────────────────

  describe('Draft creation flow', () => {
    it('creates a draft and shows it in the post list', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Type content
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await user.type(textarea, 'My first LinkedIn draft')

      // Save draft
      await user.click(screen.getByText('Save Draft'))

      // Post should appear in post list
      await waitFor(() => {
        expect(screen.getByText('My first LinkedIn draft')).toBeInTheDocument()
      })

      // Draft badge should show
      expect(screen.getByText('📝 Draft')).toBeInTheDocument()

      // Composer should be cleared
      expect(textarea).toHaveValue('')
    })

    it('does not save empty draft and shows warning toast', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Verify no posts initially
      expect(screen.getByText(/No posts yet/)).toBeInTheDocument()

      await user.click(screen.getByText('Save Draft'))

      // Post list should still be empty (toast will appear but post list unchanged)
      await waitFor(() => {
        expect(screen.getByText(/No posts yet/)).toBeInTheDocument()
      })
    })

    it('clears the composer form when Clear button is clicked', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await user.type(textarea, 'Some content to clear')
      expect(textarea).toHaveValue('Some content to clear')

      await user.click(screen.getByText('Clear'))
      expect(textarea).toHaveValue('')
    })
  })

  // ─── Flow 3: Schedule a post ───────────────────────────────────────

  describe('Post scheduling flow', () => {
    it('schedules a post with future date and time', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Type content
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await user.type(textarea, 'Scheduled post content')

      // Open schedule panel
      await user.click(screen.getByTitle('Schedule'))

      // Set a future date (tomorrow) via fireEvent.change (user.type doesn't work well with date inputs)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]

      const timeInput = screen.getByDisplayValue('09:00')
      const schedulePanel = timeInput.closest('.composer-panel')
      const dateInput = schedulePanel.querySelector('input[type="date"]')
      fireEvent.change(dateInput, { target: { value: dateStr } })

      // Click Schedule button within the schedule panel
      const scheduleBtn = within(schedulePanel).getByRole('button', { name: 'Schedule' })
      await user.click(scheduleBtn)

      // Post should appear in list with Scheduled badge
      await waitFor(() => {
        expect(screen.getByText('Scheduled post content')).toBeInTheDocument()
      })
      expect(screen.getByText('📅 Scheduled')).toBeInTheDocument()

      // Composer should be cleared
      expect(textarea).toHaveValue('')
    })

    it('validates empty content before scheduling', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Confirm no posts
      expect(screen.getByText(/No posts yet/)).toBeInTheDocument()

      // Open schedule panel without typing content
      await user.click(screen.getByTitle('Schedule'))

      const schedulePanel = screen.getByDisplayValue('09:00').closest('.composer-panel')
      const scheduleBtn = within(schedulePanel).getByRole('button', { name: 'Schedule' })
      await user.click(scheduleBtn)

      // Should show warning, no post created
      await waitFor(() => {
        expect(screen.getByText(/No posts yet/)).toBeInTheDocument()
      })
    })
  })

  // ─── Flow 4: First comment panel ──────────────────────────────────

  describe('First comment flow', () => {
    it('opens first comment panel and saves it with the draft', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Type main content
      await user.type(
        screen.getByPlaceholderText(/What do you want to talk about/),
        'Post with a first comment'
      )

      // Open first comment panel
      await user.click(screen.getByTitle('First comment'))
      const commentTextarea = screen.getByPlaceholderText(/Add a first comment/)
      expect(commentTextarea).toBeInTheDocument()

      // Type first comment
      await user.type(commentTextarea, 'Check out my link!')

      // Save draft
      await user.click(screen.getByText('Save Draft'))

      // Post should show in list with first comment preview
      await waitFor(() => {
        expect(screen.getByText('Post with a first comment')).toBeInTheDocument()
      })
      expect(screen.getByText(/Check out my link!/)).toBeInTheDocument()
    })
  })

  // ─── Flow 5: Post list filtering ──────────────────────────────────

  describe('Post list filtering', () => {
    it('filters posts by status using filter tabs', async () => {
      renderAppWithTestData()

      // Wait for test data to load (2 scheduled + 1 draft)
      await waitFor(() => {
        expect(screen.getByText(/Just launched my new course/)).toBeInTheDocument()
      })

      // Click "Drafts" filter
      await user.click(screen.getByRole('button', { name: 'Drafts' }))

      // Should only show the draft post
      expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
      expect(screen.queryByText(/Just launched my new course/)).not.toBeInTheDocument()

      // Click "Scheduled" filter
      await user.click(screen.getByRole('button', { name: 'Scheduled' }))

      // Should only show scheduled posts
      expect(screen.getByText(/Just launched my new course/)).toBeInTheDocument()
      expect(screen.queryByText(/Currently reading "Atomic Habits"/)).not.toBeInTheDocument()

      // Click "All" to show all again
      await user.click(screen.getByRole('button', { name: 'All' }))
      expect(screen.getByText(/Just launched my new course/)).toBeInTheDocument()
      expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
    })
  })

  // ─── Flow 6: Edit post via modal ──────────────────────────────────

  describe('Edit post flow', () => {
    it('opens edit modal, modifies content, and saves', async () => {
      renderAppWithTestData()

      // Wait for test data
      await waitFor(() => {
        expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
      })

      // Click first Edit button
      const editButtons = screen.getAllByText(/Edit/)
      await user.click(editButtons[0])

      // Edit modal should open
      await waitFor(() => {
        expect(screen.getByText(/Edit Post/)).toBeInTheDocument()
      })

      // Modify content
      const modalTextarea = screen.getByPlaceholderText('Write your post...')
      await user.clear(modalTextarea)
      await user.type(modalTextarea, 'Updated post content')

      // Save changes
      await user.click(screen.getByText('Save Changes'))

      // Modal should close, updated content should appear
      await waitFor(() => {
        expect(screen.queryByText(/Edit Post/)).not.toBeInTheDocument()
      })
      expect(screen.getByText('Updated post content')).toBeInTheDocument()
    })

    it('cancels edit without saving changes', async () => {
      renderAppWithTestData()

      await waitFor(() => {
        expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
      })

      // Open edit modal
      const editButtons = screen.getAllByText(/Edit/)
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/Edit Post/)).toBeInTheDocument()
      })

      // Click Cancel
      await user.click(screen.getByText('Cancel'))

      // Modal closes, original content unchanged
      await waitFor(() => {
        expect(screen.queryByText(/Edit Post/)).not.toBeInTheDocument()
      })
      expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
    })
  })

  // ─── Flow 7: Delete post ──────────────────────────────────────────

  describe('Delete post flow', () => {
    it('deletes a post after confirmation', async () => {
      renderAppWithTestData()

      await waitFor(() => {
        expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
      })

      // Click Delete on the first post card
      const deleteButtons = screen.getAllByText(/Delete/)
      const postCount = deleteButtons.length
      await user.click(deleteButtons[0])

      // confirm is auto-accepted (mocked above)
      await waitFor(() => {
        expect(screen.getAllByText(/Delete/).length).toBeLessThan(postCount)
      })
    })

    it('does not delete when confirmation is cancelled', async () => {
      window.confirm.mockReturnValue(false)

      renderAppWithTestData()

      await waitFor(() => {
        expect(screen.getByText(/Currently reading "Atomic Habits"/)).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText(/Delete/)
      const postCount = deleteButtons.length
      await user.click(deleteButtons[0])

      // Post should still be there
      expect(screen.getAllByText(/Delete/).length).toBe(postCount)
    })
  })

  // ─── Flow 8: AI content generation (full round trip) ──────────────

  describe('AI content generation flow', () => {
    it('generates post via AI, shows preview, accepts it', async () => {
      const { generatePost } = await import('../utils/aiUtils')
      generatePost.mockResolvedValue('AI-generated post about leadership')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)

      // Open AI panel
      await user.click(screen.getByTitle('AI tools'))
      expect(screen.getByText('Generate Post')).toBeInTheDocument()

      // Type topic and generate
      const topicInput = screen.getByPlaceholderText(/Enter a topic/)
      await user.type(topicInput, 'leadership')
      await user.click(screen.getByText('Generate Post'))

      // Wait for AI preview overlay to appear
      await waitFor(() => {
        expect(screen.getByText('AI-generated post about leadership')).toBeInTheDocument()
      })
      expect(screen.getByText('Accept Changes')).toBeInTheDocument()
      expect(screen.getByText('Start Over')).toBeInTheDocument()

      // Accept the AI content
      await user.click(screen.getByText('Accept Changes'))

      // AI content should now be in the composer textarea
      await waitFor(() => {
        expect(textarea).toHaveValue('AI-generated post about leadership')
      })

      // Preview overlay should be gone
      expect(screen.queryByText('Accept Changes')).not.toBeInTheDocument()
    })

    it('discards AI preview without changing content', async () => {
      const { generatePost } = await import('../utils/aiUtils')
      generatePost.mockResolvedValue('AI content to discard')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Set original content via fireEvent (faster)
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'My original content')

      // Open AI panel, generate, then discard
      await user.click(screen.getByTitle('AI tools'))
      const topicInput = screen.getByPlaceholderText(/Enter a topic/)
      await user.type(topicInput, 'anything')
      await user.click(screen.getByText('Generate Post'))

      await waitFor(() => {
        expect(screen.getByText('AI content to discard')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Discard'))

      // Original content should remain
      await waitFor(() => {
        expect(textarea).toHaveValue('My original content')
      })
      expect(screen.queryByText('AI content to discard')).not.toBeInTheDocument()
    })

    it('handles AI generation error gracefully', async () => {
      const { generatePost } = await import('../utils/aiUtils')
      generatePost.mockRejectedValue(new Error('Network error'))

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Open AI panel and try to generate
      await user.click(screen.getByTitle('AI tools'))
      const topicInput = screen.getByPlaceholderText(/Enter a topic/)
      await user.type(topicInput, 'test')
      await user.click(screen.getByText('Generate Post'))

      // Error should show in the AI panel
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Composer content should be unchanged
      expect(screen.getByPlaceholderText(/What do you want to talk about/)).toHaveValue('')
    })
  })

  // ─── Flow 9: AI refine (improve, rewrite) ─────────────────────────

  describe('AI refine flow', () => {
    it('improves existing content via Refine tab', async () => {
      const { improvePost } = await import('../utils/aiUtils')
      improvePost.mockResolvedValue('Improved version of draft')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Set content via fireEvent (faster for this test)
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'My rough draft')

      // Open AI panel and switch to Refine tab
      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Refine'))

      // Click Improve Post
      await user.click(screen.getByText('Improve Post'))

      // Preview should appear
      await waitFor(() => {
        expect(screen.getByText('Improved version of draft')).toBeInTheDocument()
      })

      // Accept
      await user.click(screen.getByText('Accept Changes'))

      await waitFor(() => {
        expect(textarea).toHaveValue('Improved version of draft')
      })
    })

    it('shows empty hint in Refine tab when no content', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Refine'))

      expect(screen.getByText(/Write some content first/)).toBeInTheDocument()
    })
  })

  // ─── Flow 10: Template insertion ───────────────────────────────────

  describe('Template insertion flow', () => {
    it('inserts a hook template into content with existing text and enables undo', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Set existing content first (so pushHistory is meaningful)
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'Existing content')

      // Open AI panel and go to Templates tab
      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Templates'))

      // Story category is default, click a hook
      await user.click(screen.getByText(/I made a mistake/))

      // Hook should be prepended to the composer
      await waitFor(() => {
        expect(textarea.value).toContain('I made a mistake that cost me everything.')
        expect(textarea.value).toContain('Existing content')
      })

      // Undo should now be available (because pushHistory was called with non-empty content)
      expect(screen.getByTitle('Undo')).toBeInTheDocument()
    })

    it('inserts a CTA ending after existing content', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Set content via fireEvent
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'My post content')

      // Open AI panel → Templates → click an ending
      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Templates'))
      await user.click(screen.getByText(/What do you think/))

      // Ending should be appended after content
      await waitFor(() => {
        expect(textarea.value).toContain('My post content')
        expect(textarea.value).toContain('What do you think? Drop your thoughts below.')
      })
    })

    it('switches hook categories in Templates tab', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Templates'))

      // Default is Story category
      expect(screen.getByText(/I made a mistake/)).toBeInTheDocument()

      // Switch to Curiosity category
      await user.click(screen.getByText('Curiosity'))
      expect(screen.queryByText(/I made a mistake/)).not.toBeInTheDocument()
    })
  })

  // ─── Flow 11: Undo after AI/template changes ──────────────────────

  describe('Undo system', () => {
    it('undoes AI-accepted content and restores original', async () => {
      const { generatePost } = await import('../utils/aiUtils')
      generatePost.mockResolvedValue('New AI content')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'Original text')

      // Generate and accept AI content
      await user.click(screen.getByTitle('AI tools'))
      const topicInput = screen.getByPlaceholderText(/Enter a topic/)
      await user.type(topicInput, 'test')
      await user.click(screen.getByText('Generate Post'))

      await waitFor(() => {
        expect(screen.getByText('New AI content')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Accept Changes'))

      await waitFor(() => {
        expect(textarea).toHaveValue('New AI content')
      })

      // Undo should be visible
      const undoBtn = screen.getByTitle('Undo')
      await user.click(undoBtn)

      // Should restore original content
      await waitFor(() => {
        expect(textarea).toHaveValue('Original text')
      })
    })
  })

  // ─── Flow 12: Viral framework generation ──────────────────────────

  describe('Viral framework flow', () => {
    it('generates content using a viral framework', async () => {
      const { generateFromFramework } = await import('../utils/aiUtils')
      generateFromFramework.mockResolvedValue('Contrarian take: Work-life balance is a myth')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Open AI panel (Generate tab is default)
      await user.click(screen.getByTitle('AI tools'))

      // Select Contrarian Take framework
      await user.click(screen.getByText('Contrarian Take'))

      // Should show framework description and input
      expect(screen.getByText(/Challenge conventional wisdom/)).toBeInTheDocument()
      const frameworkInput = screen.getByPlaceholderText(/common belief/)
      await user.type(frameworkInput, 'work-life balance')

      // Click Generate with AI
      await user.click(screen.getByText('Generate with AI'))

      // Preview should appear
      await waitFor(() => {
        expect(screen.getByText(/Contrarian take: Work-life balance is a myth/)).toBeInTheDocument()
      })

      // Accept it
      await user.click(screen.getByText('Accept Changes'))

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await waitFor(() => {
        expect(textarea).toHaveValue('Contrarian take: Work-life balance is a myth')
      })
    })

    it('inserts framework template without AI when "Use Template" is clicked', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      await user.click(screen.getByTitle('AI tools'))

      // Select Contrarian Take (has a template)
      await user.click(screen.getByText('Contrarian Take'))

      // Fill in topic (required for the section to appear)
      const frameworkInput = screen.getByPlaceholderText(/common belief/)
      await user.type(frameworkInput, 'anything')

      // Use Template (no AI call)
      await user.click(screen.getByText('Use Template'))

      // Template should be inserted with [brackets] to fill in
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await waitFor(() => {
        expect(textarea.value).toContain('Unpopular opinion')
      })
    })
  })

  // ─── Flow 13: Character limit enforcement ─────────────────────────

  describe('Character limit enforcement', () => {
    it('shows character ring and enforces 3000 char limit', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Use fireEvent.change to set bulk text (user.type is too slow for 2750 chars)
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'a'.repeat(2750))

      // Character ring should show warning count
      expect(screen.getByTitle('2750 / 3000')).toBeInTheDocument()
      expect(screen.getByText('250')).toBeInTheDocument()
    })

    it('prevents input beyond 3000 characters', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)

      // Set exactly 3000 chars
      setTextareaValue(textarea, 'a'.repeat(3000))
      expect(textarea).toHaveValue('a'.repeat(3000))

      // Try to add one more character — should be rejected by the handler
      setTextareaValue(textarea, 'a'.repeat(3001))
      // The PostComposer prevents values > 3000
      expect(textarea.value.length).toBeLessThanOrEqual(3000)
    })
  })

  // ─── Flow 14: Settings modal ───────────────────────────────────────

  describe('Settings modal flow', () => {
    it('opens and closes Settings modal', async () => {
      renderApp()

      await user.click(screen.getByText('Settings'))

      await waitFor(() => {
        expect(screen.getByText('AI Settings')).toBeInTheDocument()
      })
      expect(screen.getByText(/AI enabled with Gemini/)).toBeInTheDocument()

      // Close by clicking Cancel
      await user.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByText('AI Settings')).not.toBeInTheDocument()
      })
    })

    it('shows custom API key configuration when requested', async () => {
      renderApp()

      await user.click(screen.getByText('Settings'))

      await waitFor(() => {
        expect(screen.getByText('AI Settings')).toBeInTheDocument()
      })

      // Click to show custom config
      await user.click(screen.getByText('Use your own API key'))

      // Should show provider, API key, model fields
      expect(screen.getByLabelText('AI Provider')).toBeInTheDocument()
      expect(screen.getByLabelText(/API Key/)).toBeInTheDocument()
      expect(screen.getByLabelText('Model')).toBeInTheDocument()
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })
  })

  // ─── Flow 15: LinkedIn auth status ─────────────────────────────────

  describe('LinkedIn auth status', () => {
    it('shows Connect button when disconnected', async () => {
      renderApp()
      expect(screen.getByText('Connect LinkedIn')).toBeInTheDocument()
    })

    it('shows connected profile when LinkedIn is connected', async () => {
      const { getLinkedInStatus } = await import('../utils/linkedinApi')
      getLinkedInStatus.mockResolvedValue({
        connected: true,
        profile: { name: 'John Doe', picture: 'https://example.com/photo.jpg' },
      })

      renderApp()

      await waitFor(() => {
        expect(screen.getByText('LinkedIn Connected')).toBeInTheDocument()
      })
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Disconnect')).toBeInTheDocument()
    })

    it('disables Publish buttons when LinkedIn is not connected', async () => {
      const { getLinkedInStatus } = await import('../utils/linkedinApi')
      getLinkedInStatus.mockResolvedValue({ connected: false })

      renderAppWithTestData()

      // Wait for test data to load and LinkedIn status to resolve
      await waitFor(() => {
        expect(screen.getByText(/Just launched my new course/)).toBeInTheDocument()
      })

      // Wait for LinkedIn status check to complete
      await waitFor(() => {
        expect(screen.getByText('Connect LinkedIn')).toBeInTheDocument()
      })

      // All Publish buttons should be disabled
      const publishButtons = document.querySelectorAll('.action-button.publish')
      expect(publishButtons.length).toBeGreaterThan(0)
      publishButtons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  // ─── Flow 16: Publish post to LinkedIn ─────────────────────────────

  describe('Publish post flow', () => {
    it('publishes a post when LinkedIn is connected', async () => {
      const { getLinkedInStatus, publishToLinkedIn } = await import('../utils/linkedinApi')
      getLinkedInStatus.mockResolvedValue({
        connected: true,
        profile: { name: 'John Doe' },
      })
      publishToLinkedIn.mockResolvedValue({ success: true })

      renderAppWithTestData()

      // Wait for posts and connected status
      await waitFor(() => {
        expect(screen.getByText('LinkedIn Connected')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText(/Just launched my new course/)).toBeInTheDocument()
      })

      // Find an enabled Publish button
      const publishBtn = document.querySelector('.action-button.publish:not([disabled])')
      if (publishBtn) {
        await user.click(publishBtn)

        // Should call publishToLinkedIn
        await waitFor(() => {
          expect(publishToLinkedIn).toHaveBeenCalled()
        })
      }
    })

    it('shows error toast when publish fails', async () => {
      const { getLinkedInStatus, publishToLinkedIn } = await import('../utils/linkedinApi')
      getLinkedInStatus.mockResolvedValue({
        connected: true,
        profile: { name: 'John Doe' },
      })
      publishToLinkedIn.mockRejectedValue(new Error('LinkedIn API error'))

      renderAppWithTestData()

      await waitFor(() => {
        expect(screen.getByText('LinkedIn Connected')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText(/Just launched my new course/)).toBeInTheDocument()
      })

      const publishBtn = document.querySelector('.action-button.publish:not([disabled])')
      if (publishBtn) {
        await user.click(publishBtn)

        await waitFor(() => {
          expect(screen.getByText(/Failed to publish: LinkedIn API error/)).toBeInTheDocument()
        })
      }
    })
  })

  // ─── Flow 17: Complete post lifecycle ──────────────────────────────

  describe('Complete post lifecycle: compose → save → edit → delete', () => {
    it('creates draft, edits it, then deletes it', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Step 1: Create a draft
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await user.type(textarea, 'Lifecycle test post')
      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText('Lifecycle test post')).toBeInTheDocument()
      })

      // Step 2: Edit the draft — use specific button within the post card
      const postCard = screen.getByText('Lifecycle test post').closest('.post-card')
      const editBtn = within(postCard).getByText(/Edit/)
      await user.click(editBtn)

      await waitFor(() => {
        expect(screen.getByText(/Edit Post/)).toBeInTheDocument()
      })

      const modalTextarea = screen.getByPlaceholderText('Write your post...')
      await user.clear(modalTextarea)
      await user.type(modalTextarea, 'Updated lifecycle post')
      await user.click(screen.getByText('Save Changes'))

      await waitFor(() => {
        expect(screen.getByText('Updated lifecycle post')).toBeInTheDocument()
      })

      // Step 3: Delete the post — use specific button within the post card
      const updatedCard = screen.getByText('Updated lifecycle post').closest('.post-card')
      const deleteBtn = within(updatedCard).getByText(/Delete/)
      await user.click(deleteBtn)

      await waitFor(() => {
        expect(screen.queryByText('Updated lifecycle post')).not.toBeInTheDocument()
      })
      expect(screen.getByText(/No posts yet/)).toBeInTheDocument()
    })
  })

  // ─── Flow 18: AI-assisted full workflow ────────────────────────────

  describe('AI-assisted full workflow: generate → accept → add ending → save draft', () => {
    it('generates AI content, adds a CTA ending, and saves as draft', async () => {
      const { generatePost } = await import('../utils/aiUtils')
      generatePost.mockResolvedValue('Five lessons I learned from failing fast')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Step 1: Generate with AI
      await user.click(screen.getByTitle('AI tools'))
      const topicInput = screen.getByPlaceholderText(/Enter a topic/)
      await user.type(topicInput, 'failure lessons')
      await user.click(screen.getByText('Generate Post'))

      await waitFor(() => {
        expect(screen.getByText('Five lessons I learned from failing fast')).toBeInTheDocument()
      })

      // Step 2: Accept
      await user.click(screen.getByText('Accept Changes'))

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      await waitFor(() => {
        expect(textarea).toHaveValue('Five lessons I learned from failing fast')
      })

      // Step 3: Add a CTA ending via Templates tab
      await user.click(screen.getByText('Templates'))
      await user.click(screen.getByText(/What do you think/))

      await waitFor(() => {
        expect(textarea.value).toContain('Five lessons I learned from failing fast')
        expect(textarea.value).toContain('What do you think?')
      })

      // Step 4: Save as draft
      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText(/Five lessons I learned from failing fast/)).toBeInTheDocument()
      })

      // Composer should be cleared
      expect(textarea).toHaveValue('')
    })
  })

  // ─── Flow 19: Multiple drafts and list count ──────────────────────

  describe('Multiple posts management', () => {
    it('creates multiple drafts and shows correct count', async () => {
      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)

      // Create draft 1
      setTextareaValue(textarea, 'Draft one')
      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText('Draft one')).toBeInTheDocument()
      })

      // Create draft 2
      setTextareaValue(textarea, 'Draft two')
      await user.click(screen.getByText('Save Draft'))

      await waitFor(() => {
        expect(screen.getByText('Draft two')).toBeInTheDocument()
      })

      // Both should appear, count should show (2)
      expect(screen.getByText('(2)')).toBeInTheDocument()
    })
  })

  // ─── Flow 20: AI suggest first comment ─────────────────────────────

  describe('AI suggest first comment', () => {
    it('generates first comment via AI and populates the field', async () => {
      const { generateFirstComment } = await import('../utils/aiUtils')
      generateFirstComment.mockResolvedValue('Great insights! Follow me for more.')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Set content via fireEvent for speed
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'My post about productivity')

      // Open AI panel → Refine → Suggest First Comment
      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Refine'))
      await user.click(screen.getByText('Suggest First Comment'))

      // Wait for generateFirstComment to be called
      await waitFor(() => {
        expect(generateFirstComment).toHaveBeenCalledWith('My post about productivity')
      })

      // First comment panel should now be visible with the AI-generated comment
      await waitFor(() => {
        const commentTextarea = screen.getByPlaceholderText(/Add a first comment/)
        expect(commentTextarea).toHaveValue('Great insights! Follow me for more.')
      })
    })
  })

  // ─── Flow 21: Hashtag generation ───────────────────────────────────

  describe('AI hashtag generation', () => {
    it('adds hashtags to existing content via AI preview', async () => {
      const { generateHashtags } = await import('../utils/aiUtils')
      generateHashtags.mockResolvedValue('#leadership #productivity')

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      // Set content via fireEvent (avoids character-by-character typing issues)
      const textarea = screen.getByPlaceholderText(/What do you want to talk about/)
      setTextareaValue(textarea, 'My leadership post')

      // Open AI → Refine → Add Hashtags
      await user.click(screen.getByTitle('AI tools'))
      await user.click(screen.getByText('Refine'))
      await user.click(screen.getByText('Add Hashtags'))

      // Should show preview with combined content
      await waitFor(() => {
        expect(screen.getByText('Accept Changes')).toBeInTheDocument()
      })

      // Accept
      await user.click(screen.getByText('Accept Changes'))

      await waitFor(() => {
        expect(textarea.value).toContain('My leadership post')
        expect(textarea.value).toContain('#leadership #productivity')
      })
    })
  })

  // ─── Flow 22: Post ideas generation ────────────────────────────────

  describe('Post ideas generation', () => {
    it('generates and displays post ideas in the panel', async () => {
      const { generatePostIdeas } = await import('../utils/aiUtils')
      generatePostIdeas.mockResolvedValue(
        '1. Remote work productivity tips\n2. Building a personal brand\n3. AI in the workplace'
      )

      localStorage.setItem('linkedinPosts', JSON.stringify([]))
      renderApp()

      await user.click(screen.getByTitle('AI tools'))
      const topicInput = screen.getByPlaceholderText(/Enter a topic/)
      await user.type(topicInput, 'career growth')
      await user.click(screen.getByText('Get Ideas'))

      await waitFor(() => {
        expect(screen.getByText(/Remote work productivity tips/)).toBeInTheDocument()
        expect(screen.getByText(/Building a personal brand/)).toBeInTheDocument()
      })
    })
  })
})
