import { useState } from 'react'
import { parseDateTime } from '../utils/dateUtils'
import ImageUpload from './ImageUpload'
import './PostComposer.css'

export default function PostComposer({ onSaveDraft, onSchedule }) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [charCount, setCharCount] = useState(0)

  const MAX_CHARS = 3000

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

  const handleSaveDraft = () => {
    if (!content.trim()) {
      alert('Please write something first!')
      return
    }
    onSaveDraft(content, image)
    resetForm()
  }

  const handleSchedule = () => {
    if (!content.trim()) {
      alert('Please write something first!')
      return
    }
    if (!scheduleDate) {
      alert('Please pick a date!')
      return
    }
    if (!scheduleTime) {
      alert('Please pick a time!')
      return
    }

    const scheduledTime = parseDateTime(scheduleDate, scheduleTime)
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

    onSchedule(content, image, scheduledTime)
    resetForm()
  }

  const resetForm = () => {
    setContent('')
    setImage(null)
    setScheduleDate('')
    setScheduleTime('09:00')
    setCharCount(0)
  }

  return (
    <div className="post-composer">
      <h2>📝 Compose New Post</h2>

      <textarea
        className="post-textarea"
        placeholder="What's on your mind? Share your thoughts with your LinkedIn network..."
        value={content}
        onChange={handleContentChange}
      />

      <div className="char-count">
        {charCount} / {MAX_CHARS} characters
      </div>

      <ImageUpload
        onImageSelect={handleImageSelect}
        currentImage={image}
        onRemove={handleRemoveImage}
      />

      <div className="schedule-section">
        <h3>📅 Schedule Post</h3>
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

      <div className="composer-actions">
        <button className="btn btn-secondary" onClick={resetForm}>
          ✕ Clear
        </button>
        <button className="btn btn-tertiary" onClick={handleSaveDraft}>
          💾 Save as Draft
        </button>
        <button className="btn btn-primary" onClick={handleSchedule}>
          📅 Schedule Post
        </button>
      </div>
    </div>
  )
}
