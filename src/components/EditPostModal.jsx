import { useState, useEffect } from 'react'
import { formatDateInput, formatTimeInput, parseDateTime } from '../utils/dateUtils'
import ImageUpload from './ImageUpload'
import './EditPostModal.css'

export default function EditPostModal({ post, onSave, onCancel }) {
  const [content, setContent] = useState(post?.content || '')
  const [image, setImage] = useState(post?.image || null)
  const [scheduleDate, setScheduleDate] = useState(() => {
    return post?.scheduledTime ? formatDateInput(post.scheduledTime) : ''
  })
  const [scheduleTime, setScheduleTime] = useState(() => {
    return post?.scheduledTime ? formatTimeInput(post.scheduledTime) : '09:00'
  })
  const [charCount, setCharCount] = useState(post?.content?.length || 0)

  const MAX_CHARS = 3000
  const isDraft = post?.status === 'draft'

  const handleContentChange = (e) => {
    const text = e.target.value
    if (text.length <= MAX_CHARS) {
      setContent(text)
      setCharCount(text.length)
    }
  }

  const handleImageSelect = (base64) => {
    setImage(base64)
  }

  const handleRemoveImage = () => {
    setImage(null)
  }

  const handleSave = () => {
    if (!content.trim()) {
      alert('Please write something!')
      return
    }

    let scheduledTime = null
    if (!isDraft) {
      if (!scheduleDate || !scheduleTime) {
        alert('Please pick a date and time!')
        return
      }

      scheduledTime = parseDateTime(scheduleDate, scheduleTime)
      if (!scheduledTime) {
        alert('Invalid date/time!')
        return
      }

      const now = new Date()
      const selectedDateTime = new Date(scheduledTime)
      if (selectedDateTime <= now) {
        alert('Schedule time must be in the future!')
        return
      }
    }

    onSave({
      ...post,
      content,
      image,
      scheduledTime,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Post</h2>
          <button className="close-button" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={handleContentChange}
              className="modal-textarea"
              placeholder="Write your post..."
            />
            <div className="char-count">{charCount} / {MAX_CHARS}</div>
          </div>

          <ImageUpload
            onImageSelect={handleImageSelect}
            currentImage={image}
            onRemove={handleRemoveImage}
          />

          {!isDraft && (
            <div className="form-group">
              <label>Schedule</label>
              <div className="schedule-inputs">
                <div className="input-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
