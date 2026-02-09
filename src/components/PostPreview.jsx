import { useState } from 'react'
import './PostPreview.css'

// LinkedIn truncation thresholds (approximate character counts)
const DESKTOP_TRUNCATE = 210
const MOBILE_TRUNCATE = 140

export default function PostPreview({ content, image }) {
  const [device, setDevice] = useState('desktop')
  const [expanded, setExpanded] = useState(false)

  if (!content || !content.trim()) {
    return (
      <div className="post-preview">
        <div className="preview-header">
          <h3>Preview</h3>
        </div>
        <div className="preview-empty">Start typing to see your post preview</div>
      </div>
    )
  }

  const truncateAt = device === 'desktop' ? DESKTOP_TRUNCATE : MOBILE_TRUNCATE
  const needsTruncation = content.length > truncateAt
  const displayText = expanded || !needsTruncation
    ? content
    : content.substring(0, truncateAt)

  return (
    <div className="post-preview">
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="device-toggle">
          <button
            className={`device-btn ${device === 'desktop' ? 'active' : ''}`}
            onClick={() => { setDevice('desktop'); setExpanded(false) }}
          >
            Desktop
          </button>
          <button
            className={`device-btn ${device === 'mobile' ? 'active' : ''}`}
            onClick={() => { setDevice('mobile'); setExpanded(false) }}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className={`preview-card ${device}`}>
        <div className="preview-author">
          <div className="author-avatar" />
          <div className="author-info">
            <span className="author-name">Your Name</span>
            <span className="author-headline">Your headline</span>
          </div>
        </div>

        <div className="preview-body">
          <p className="preview-text">{displayText}</p>
          {needsTruncation && !expanded && (
            <button
              className="see-more-btn"
              onClick={() => setExpanded(true)}
            >
              ...see more
            </button>
          )}
          {expanded && needsTruncation && (
            <button
              className="see-more-btn"
              onClick={() => setExpanded(false)}
            >
              show less
            </button>
          )}
        </div>

        {image && (
          <img src={image} alt="Post" className="preview-image" />
        )}

        {needsTruncation && !expanded && (
          <div className="truncation-indicator">
            Truncates at ~{truncateAt} chars on {device}. {content.length - truncateAt} chars hidden.
          </div>
        )}

        <div className="preview-engagement">
          <span>Like</span>
          <span>Comment</span>
          <span>Repost</span>
          <span>Send</span>
        </div>
      </div>
    </div>
  )
}
