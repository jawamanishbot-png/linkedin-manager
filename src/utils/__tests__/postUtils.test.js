import { describe, it, expect, beforeEach } from 'vitest'
import {
  createPost,
  createDraft,
  getAllPosts,
  deletePost,
  updatePost,
  publishPost,
  getPostsByStatus,
  getStats,
  clearAllPosts,
  scheduleDraft,
} from '../postUtils'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('postUtils', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('createPost', () => {
    it('creates a scheduled post with all fields', () => {
      const post = createPost('Hello LinkedIn!', null, '2026-03-01T09:00:00.000Z', 'First comment')
      expect(post.content).toBe('Hello LinkedIn!')
      expect(post.image).toBeNull()
      expect(post.firstComment).toBe('First comment')
      expect(post.scheduledTime).toBe('2026-03-01T09:00:00.000Z')
      expect(post.status).toBe('scheduled')
      expect(post.id).toBeDefined()
      expect(post.createdAt).toBeDefined()
    })

    it('stores the post in localStorage', () => {
      createPost('Test', null, '2026-03-01T09:00:00.000Z')
      const posts = getAllPosts()
      expect(posts).toHaveLength(1)
      expect(posts[0].content).toBe('Test')
    })

    it('sets firstComment to null when not provided', () => {
      const post = createPost('No comment', null, '2026-03-01T09:00:00.000Z')
      expect(post.firstComment).toBeNull()
    })
  })

  describe('createDraft', () => {
    it('creates a draft with status "draft" and no scheduledTime', () => {
      const draft = createDraft('Draft content', null, 'My first comment')
      expect(draft.content).toBe('Draft content')
      expect(draft.status).toBe('draft')
      expect(draft.scheduledTime).toBeNull()
      expect(draft.firstComment).toBe('My first comment')
    })

    it('stores image when provided', () => {
      const draft = createDraft('With image', 'data:image/png;base64,abc123')
      expect(draft.image).toBe('data:image/png;base64,abc123')
    })

    it('sets firstComment to null when empty', () => {
      const draft = createDraft('Test', null, '')
      expect(draft.firstComment).toBeNull()
    })
  })

  describe('getAllPosts', () => {
    it('returns empty array when no posts exist', () => {
      expect(getAllPosts()).toEqual([])
    })

    it('returns all created posts', () => {
      createPost('Post 1', null, '2026-03-01T09:00:00.000Z')
      createDraft('Draft 1', null)
      expect(getAllPosts()).toHaveLength(2)
    })
  })

  describe('deletePost', () => {
    it('removes post from storage', () => {
      const post = createPost('To delete', null, '2026-03-01T09:00:00.000Z')
      expect(getAllPosts()).toHaveLength(1)
      deletePost(post.id)
      expect(getAllPosts()).toHaveLength(0)
    })

    it('returns true on deletion', () => {
      const post = createPost('Test', null, '2026-03-01T09:00:00.000Z')
      expect(deletePost(post.id)).toBe(true)
    })
  })

  describe('updatePost', () => {
    it('updates post fields', () => {
      const post = createPost('Original', null, '2026-03-01T09:00:00.000Z')
      const updated = updatePost(post.id, { content: 'Updated' })
      expect(updated.content).toBe('Updated')
      expect(updated.id).toBe(post.id)
    })

    it('returns null for non-existent post', () => {
      expect(updatePost('nonexistent', { content: 'x' })).toBeNull()
    })

    it('preserves id even if updates include different id', () => {
      const post = createPost('Test', null, '2026-03-01T09:00:00.000Z')
      const updated = updatePost(post.id, { id: 'hacked', content: 'New' })
      expect(updated.id).toBe(post.id)
    })
  })

  describe('publishPost', () => {
    it('sets status to published with publishedAt timestamp', () => {
      const post = createPost('Publish me', null, '2026-03-01T09:00:00.000Z')
      const published = publishPost(post.id)
      expect(published.status).toBe('published')
      expect(published.publishedAt).toBeDefined()
    })
  })

  describe('scheduleDraft', () => {
    it('converts draft to scheduled', () => {
      const draft = createDraft('My draft', null)
      const scheduled = scheduleDraft(draft.id, '2026-04-01T10:00:00.000Z')
      expect(scheduled.status).toBe('scheduled')
      expect(scheduled.scheduledTime).toBe('2026-04-01T10:00:00.000Z')
    })
  })

  describe('getPostsByStatus', () => {
    it('filters posts by status', () => {
      createPost('Scheduled', null, '2026-03-01T09:00:00.000Z')
      createDraft('Draft', null)
      createDraft('Another draft', null)

      expect(getPostsByStatus('scheduled')).toHaveLength(1)
      expect(getPostsByStatus('draft')).toHaveLength(2)
      expect(getPostsByStatus('published')).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    it('returns correct statistics', () => {
      createPost('S1', null, '2026-03-01T09:00:00.000Z')
      createPost('S2', null, '2026-03-02T09:00:00.000Z')
      createDraft('D1', null)
      const post = createPost('P1', null, '2026-03-03T09:00:00.000Z')
      publishPost(post.id)

      const stats = getStats()
      expect(stats.total).toBe(4)
      expect(stats.scheduled).toBe(2)
      expect(stats.drafts).toBe(1)
      expect(stats.published).toBe(1)
    })
  })

  describe('clearAllPosts', () => {
    it('removes all posts', () => {
      createPost('Test', null, '2026-03-01T09:00:00.000Z')
      createDraft('Test', null)
      clearAllPosts()
      expect(getAllPosts()).toEqual([])
    })
  })
})
