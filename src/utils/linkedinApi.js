// In development, Vite proxy forwards /api to the backend.
// In production, set VITE_API_URL to the backend origin if hosted separately.
const API_BASE = import.meta.env.VITE_API_URL || ''

// Check LinkedIn connection status
export async function getLinkedInStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/linkedin/status`, {
      credentials: 'include',
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to check LinkedIn status:', error)
    return { connected: false }
  }
}

// Get the LinkedIn OAuth URL (redirects through backend)
export function getLinkedInAuthUrl() {
  return `${API_BASE}/api/auth/linkedin`
}

// Disconnect LinkedIn account
export async function disconnectLinkedIn() {
  try {
    const response = await fetch(
      `${API_BASE}/api/auth/linkedin/disconnect`,
      {
        method: 'POST',
        credentials: 'include',
      }
    )
    return await response.json()
  } catch (error) {
    console.error('Failed to disconnect LinkedIn:', error)
    return { success: false }
  }
}

// Fetch user's past LinkedIn posts
export async function getLinkedInPosts(start = 0, count = 20) {
  try {
    const response = await fetch(
      `${API_BASE}/api/linkedin/posts?start=${start}&count=${count}`,
      { credentials: 'include' }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch posts')
    }

    return data
  } catch (error) {
    console.error('Failed to fetch LinkedIn posts:', error)
    throw error
  }
}

// Publish a post to LinkedIn
export async function publishToLinkedIn(content, image) {
  try {
    const response = await fetch(`${API_BASE}/api/linkedin/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, image }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to publish post')
    }

    return data
  } catch (error) {
    console.error('Publish to LinkedIn failed:', error)
    throw error
  }
}
