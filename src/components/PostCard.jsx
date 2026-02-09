import { formatScheduleDisplay, getRelativeTime, isPastDate } from '../utils/dateUtils'
import './PostCard.css'

export default function PostCard({ post, onEdit, onDelete, onSchedule, onPublish, linkedInConnected, isPublishing }) {
  const isPast = post.scheduledTime && isPastDate(post.scheduledTime)
  const isScheduled = post.status === 'scheduled'
  const isDraft = post.status === 'draft'
  const isPublished = post.status === 'published'

  return (
    <div className={`post-card ${post.status} ${isPast ? 'past' : ''}`}>
      <div className="post-header">
        <div>
          {isScheduled && <span className="status-badge scheduled">📅 Scheduled</span>}
          {isDraft && <span className="status-badge draft">📝 Draft</span>}
          {isPublished && <span className="status-badge published">✅ Published</span>}
        </div>
        <span className="time-relative">
          {isScheduled ? getRelativeTime(post.scheduledTime) : isPublished ? 'Published' : 'Not scheduled'}
        </span>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        {post.image && (
          <img src={post.image} alt="Post" className="post-image" />
        )}
      </div>

      <div className="post-meta">
        {isScheduled && (
          <span className="scheduled-time">
            {formatScheduleDisplay(post.scheduledTime)}
          </span>
        )}
      </div>

      <div className="post-actions">
        {!isPublished && (
          <button className="action-button edit" onClick={() => onEdit(post)}>
            ✏️ Edit
          </button>
        )}
        {isDraft && (
          <button className="action-button schedule" onClick={() => onSchedule(post)}>
            📅 Schedule
          </button>
        )}
        {!isPublished && (
          <button
            className={`action-button publish ${!linkedInConnected ? 'disabled' : ''}`}
            onClick={() => onPublish(post)}
            disabled={isPublishing || !linkedInConnected}
            title={!linkedInConnected ? 'Connect LinkedIn first' : 'Publish to LinkedIn now'}
          >
            {isPublishing ? '⏳ Publishing...' : '🚀 Publish'}
          </button>
        )}
        <button className="action-button delete" onClick={() => onDelete(post.id)}>
          🗑️ Delete
        </button>
      </div>
    </div>
  )
}
