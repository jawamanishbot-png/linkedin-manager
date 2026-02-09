import { getSession } from '../_lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = getSession(req)
  if (!session || !session.accessToken || session.expiresAt <= Date.now()) {
    return res.status(401).json({ error: 'Not authenticated with LinkedIn. Please connect first.' })
  }

  const { accessToken, profile } = session
  const authorUrn = `urn:li:person:${profile.id}`
  const count = Math.min(parseInt(req.query.count) || 20, 50)
  const start = parseInt(req.query.start) || 0

  try {
    const params = new URLSearchParams({
      q: 'author',
      author: authorUrn,
      count: String(count),
      start: String(start),
      sortBy: 'LAST_MODIFIED',
    })

    const postsResponse = await fetch(
      `https://api.linkedin.com/rest/posts?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202501',
        },
      }
    )

    if (!postsResponse.ok) {
      const errorData = await postsResponse.json().catch(() => ({}))
      if (postsResponse.status === 403) {
        return res.status(403).json({
          error: 'Your LinkedIn app does not have permission to read posts. The r_member_social scope is required.',
          scopeRequired: 'r_member_social',
        })
      }
      throw new Error(errorData.message || `LinkedIn API error: ${postsResponse.status}`)
    }

    const data = await postsResponse.json()
    const posts = (data.elements || []).map((post) => ({
      id: post.id,
      text: post.commentary || '',
      visibility: post.visibility,
      createdAt: post.createdAt,
      lastModifiedAt: post.lastModifiedAt,
      lifecycleState: post.lifecycleState,
      hasMedia: !!(post.content && Object.keys(post.content).length > 0),
    }))

    res.json({
      posts,
      paging: { start, count, total: data.paging?.total },
    })
  } catch (err) {
    console.error('Fetch posts error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch posts from LinkedIn' })
  }
}
