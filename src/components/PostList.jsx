import { useState } from 'react'
import PostCard from './PostCard'
import './PostList.css'

export default function PostList({ posts, onEdit, onDelete, onSchedule, onPublish, linkedInConnected, publishingId }) {
  const [filter, setFilter] = useState('all')

  const filteredPosts = posts.filter((post) => {
    if (filter === 'all') return true
    return post.status === filter
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    // Drafts first, then scheduled by date
    if (a.status === 'draft' && b.status !== 'draft') return -1
    if (a.status !== 'draft' && b.status === 'draft') return 1

    // Sort scheduled by date (nearest first)
    if (a.scheduledTime && b.scheduledTime) {
      return new Date(a.scheduledTime) - new Date(b.scheduledTime)
    }

    return 0
  })

  return (
    <div className="post-list">
      <div className="list-header">
        <h2>📋 Scheduled Posts</h2>
        <span className="post-count">({sortedPosts.length})</span>
      </div>

      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'scheduled' ? 'active' : ''}`}
          onClick={() => setFilter('scheduled')}
        >
          Scheduled
        </button>
        <button
          className={`filter-tab ${filter === 'draft' ? 'active' : ''}`}
          onClick={() => setFilter('draft')}
        >
          Drafts
        </button>
      </div>

      {sortedPosts.length === 0 ? (
        <div className="empty-state">
          <p>🙌 No posts yet</p>
          <p className="empty-text">Create your first post in the composer!</p>
        </div>
      ) : (
        <div className="posts-container">
          {sortedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={onEdit}
              onDelete={onDelete}
              onSchedule={onSchedule}
              onPublish={onPublish}
              linkedInConnected={linkedInConnected}
              isPublishing={publishingId === post.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
