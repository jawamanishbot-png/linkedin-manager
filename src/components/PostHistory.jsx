import { useState, useEffect } from 'react'
import { getLinkedInPosts } from '../utils/linkedinApi'
import './PostHistory.css'

const PAGE_SIZE = 10

export default function PostHistory({ linkedInConnected }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [start, setStart] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchPosts = async (offset = 0, append = false) => {
    setLoading(true)
    setError('')
    try {
      const data = await getLinkedInPosts(offset, PAGE_SIZE)
      const newPosts = data.posts || []
      setPosts(append ? (prev) => [...prev, ...newPosts] : newPosts)
      setStart(offset + newPosts.length)
      setHasMore(newPosts.length === PAGE_SIZE)
      setFetched(true)
    } catch (err) {
      setError(err.message)
      setFetched(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (linkedInConnected && !fetched) {
      fetchPosts(0)
    }
  }, [linkedInConnected, fetched])

  // Reset when disconnected
  useEffect(() => {
    if (!linkedInConnected) {
      setPosts([])
      setFetched(false)
      setStart(0)
      setError('')
    }
  }, [linkedInConnected])

  if (!linkedInConnected) {
    return (
      <div className="post-history">
        <h2>📄 LinkedIn Post History</h2>
        <p className="post-history-hint">Connect your LinkedIn account to view your past posts.</p>
      </div>
    )
  }

  const isScopeError = error.includes('r_member_social') || error.includes('permission')

  return (
    <div className="post-history">
      <div className="post-history-header">
        <h2>📄 LinkedIn Post History</h2>
        {fetched && !error && (
          <button
            className="post-history-refresh"
            onClick={() => { setPosts([]); setStart(0); fetchPosts(0) }}
            disabled={loading}
          >
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className={`post-history-error ${isScopeError ? 'scope-error' : ''}`}>
          {isScopeError ? (
            <>
              <p><strong>Permission not available</strong></p>
              <p>
                Reading LinkedIn posts requires the <code>r_member_social</code> scope.
                This is a restricted LinkedIn API permission that requires approval from LinkedIn.
                You can apply for it in the LinkedIn Developer Portal under &quot;Community Management API&quot;.
              </p>
            </>
          ) : (
            <p>{error}</p>
          )}
          <button className="post-history-dismiss" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}

      {loading && posts.length === 0 && (
        <div className="post-history-loading">
          <span className="post-history-spinner" />
          Loading your LinkedIn posts...
        </div>
      )}

      {fetched && !error && posts.length === 0 && !loading && (
        <p className="post-history-empty">No posts found on your LinkedIn profile.</p>
      )}

      {posts.length > 0 && (
        <div className="post-history-list">
          {posts.map((post) => (
            <div key={post.id} className="post-history-item">
              <div className="post-history-meta">
                <span className="post-history-date">
                  {new Date(post.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className={`post-history-visibility ${post.visibility?.toLowerCase()}`}>
                  {post.visibility}
                </span>
                {post.hasMedia && <span className="post-history-media">Has media</span>}
              </div>
              <p className="post-history-text">
                {post.text.length > 200 ? `${post.text.slice(0, 200)}...` : post.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <button
          className="post-history-load-more"
          onClick={() => fetchPosts(start, true)}
        >
          Load More
        </button>
      )}

      {loading && posts.length > 0 && (
        <div className="post-history-loading">
          <span className="post-history-spinner" />
          Loading more...
        </div>
      )}
    </div>
  )
}
