import { useState, useRef } from 'react'
import { parseDateTime } from '../utils/dateUtils'
import ImageUpload from './ImageUpload'
import FormattingToolbar from './FormattingToolbar'
import AiOutputPreview from './AiOutputPreview'
import { useToast } from './ToastNotification'
import './PostComposer.css'

export default function PostComposer({
  content,
  image,
  firstComment,
  onContentChange,
  onImageChange,
  onFirstCommentChange,
  onSaveDraft,
  onSchedule,
  aiPreview,
  onAcceptAi,
  onDiscardAi,
  onRetryAi,
  isRetrying,
  canUndo,
  onUndo,
}) {
  const textareaRef = useRef(null)
  const { showToast } = useToast()

  const MAX_CHARS = 3000
  const charCount = content.length

  const handleContentChange = (e) => {
    const text = e.target.value
    if (text.length <= MAX_CHARS) {
      onContentChange(text)
    }
  }

  const handleTextChange = (newText) => {
    if (newText.length <= MAX_CHARS) {
      onContentChange(newText)
    }
  }

  const handleSaveDraft = () => {
    if (!content.trim()) {
      showToast('Please write something first!', 'warning')
      return
    }
    onSaveDraft()
  }

  const handleSchedule = (date, time) => {
    if (!content.trim()) {
      showToast('Please write something first!', 'warning')
      return
    }
    if (!date) {
      showToast('Please pick a date!', 'warning')
      return
    }
    if (!time) {
      showToast('Please pick a time!', 'warning')
      return
    }

    const scheduledTime = parseDateTime(date, time)
    if (!scheduledTime) {
      showToast('Invalid date/time!', 'error')
      return
    }

    const now = new Date()
    const selectedDateTime = new Date(scheduledTime)
    if (selectedDateTime <= now) {
      showToast('Schedule time must be in the future!', 'warning')
      return
    }

    onSchedule(scheduledTime)
  }

  return (
    <div className={`post-composer ${aiPreview ? 'has-preview' : ''}`}>
      <h2>Compose New Post</h2>

      <FormattingToolbar textareaRef={textareaRef} onTextChange={handleTextChange} />

      <div className="textarea-wrapper">
        <textarea
          ref={textareaRef}
          className={`post-textarea has-toolbar ${aiPreview ? 'dimmed' : ''}`}
          placeholder="What's on your mind? Share your thoughts with your LinkedIn network..."
          value={content}
          onChange={handleContentChange}
          disabled={!!aiPreview}
        />
        {aiPreview && (
          <AiOutputPreview
            originalContent={content}
            aiContent={aiPreview.content}
            actionLabel={aiPreview.label}
            onAccept={onAcceptAi}
            onDiscard={onDiscardAi}
            onRetry={onRetryAi}
            isRetrying={isRetrying}
          />
        )}
      </div>

      <div className="char-count-row">
        <span className="char-count">
          {charCount} / {MAX_CHARS} characters
        </span>
        {canUndo && (
          <button className="btn-undo" onClick={onUndo}>
            Undo
          </button>
        )}
      </div>

      <ImageUpload
        onImageSelect={onImageChange}
        currentImage={image}
        onRemove={() => onImageChange(null)}
      />

      <div className="first-comment-section">
        <h3>First Comment (optional)</h3>
        <p className="first-comment-hint">
          Links in the first comment get better reach than links in the post body.
        </p>
        <textarea
          className="first-comment-textarea"
          placeholder="Add a first comment with your link, hashtags, or CTA..."
          value={firstComment}
          onChange={(e) => onFirstCommentChange(e.target.value)}
        />
      </div>

      <ScheduleSection onSchedule={handleSchedule} />

      <div className="composer-actions sticky-bottom">
        <button className="btn btn-secondary" onClick={() => {
          onContentChange('')
          onImageChange(null)
          onFirstCommentChange('')
          showToast('Form cleared', 'info')
        }}>
          Clear
        </button>
        <button className="btn btn-tertiary" onClick={handleSaveDraft}>
          Save as Draft
        </button>
      </div>
    </div>
  )
}

function ScheduleSection({ onSchedule }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')

  return (
    <div className="schedule-section">
      <h3>Schedule Post</h3>
      <div className="schedule-inputs">
        <div className="input-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <button
        className="btn btn-primary schedule-btn"
        onClick={() => onSchedule(date, time)}
      >
        Schedule Post
      </button>
    </div>
  )
}
