// localStorage key
const STORAGE_KEY = 'linkedinPosts'

// Get all posts from localStorage
export function getAllPosts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading posts:', error)
    return []
  }
}

// Get posts by status
export function getPostsByStatus(status) {
  const posts = getAllPosts()
  return posts.filter((p) => p.status === status)
}

// Get posts for a specific date
export function getPostsForDate(date) {
  const posts = getAllPosts()
  const dateStr = date.toISOString().split('T')[0]
  return posts.filter((p) => p.scheduledTime.startsWith(dateStr))
}

// Save all posts to localStorage
function saveAllPosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
    return true
  } catch (error) {
    console.error('Error saving posts:', error)
    return false
  }
}

// Create new post
export function createPost(content, image, scheduledTime, firstComment) {
  const posts = getAllPosts()
  const newPost = {
    id: Date.now().toString(),
    content,
    image: image || null,
    firstComment: firstComment || null,
    scheduledTime,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  }
  posts.push(newPost)
  saveAllPosts(posts)
  return newPost
}

// Create draft (same as post but status = 'draft')
export function createDraft(content, image, firstComment) {
  const posts = getAllPosts()
  const newPost = {
    id: Date.now().toString(),
    content,
    image: image || null,
    firstComment: firstComment || null,
    scheduledTime: null,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
  posts.push(newPost)
  saveAllPosts(posts)
  return newPost
}

// Get post by ID
export function getPostById(id) {
  const posts = getAllPosts()
  return posts.find((p) => p.id === id)
}

// Update post
export function updatePost(id, updates) {
  const posts = getAllPosts()
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) return null

  posts[index] = { ...posts[index], ...updates, id }
  saveAllPosts(posts)
  return posts[index]
}

// Delete post
export function deletePost(id) {
  const posts = getAllPosts()
  const filtered = posts.filter((p) => p.id !== id)
  saveAllPosts(filtered)
  return true
}

// Schedule a draft (convert draft to scheduled)
export function scheduleDraft(id, scheduledTime) {
  return updatePost(id, {
    scheduledTime,
    status: 'scheduled',
  })
}

// Publish a post (update status to published)
export function publishPost(id) {
  return updatePost(id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  })
}

// Get stats
export function getStats() {
  const posts = getAllPosts()
  return {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    drafts: posts.filter((p) => p.status === 'draft').length,
    published: posts.filter((p) => p.status === 'published').length,
  }
}

// Clear all posts (for testing)
export function clearAllPosts() {
  localStorage.removeItem(STORAGE_KEY)
}

// Initialize with sample data (optional)
export function initializeSampleData() {
  const existing = getAllPosts()
  if (existing.length > 0) return // Don't overwrite

  const samplePosts = [
    {
      id: Date.now().toString(),
      content: 'Just launched my new course on web development! 🚀 Check it out and let me know what you think.',
      image: null,
      scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: (Date.now() - 1000).toString(),
      content: 'Weekly tip: Always break down big problems into smaller, manageable tasks. What\'s your go-to productivity hack?',
      image: null,
      scheduledTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
    {
      id: (Date.now() - 2000).toString(),
      content: 'Currently reading "Atomic Habits" - highly recommend it for anyone looking to improve their workflow.',
      image: null,
      scheduledTime: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
    },
  ]

  saveAllPosts(samplePosts)
}
