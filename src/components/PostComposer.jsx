import { useState, useRef } from 'react'
import { parseDateTime } from '../utils/dateUtils'
import ImageUpload from './ImageUpload'
import FormattingToolbar from './FormattingToolbar'
import HookTemplates from './HookTemplates'
import AiAssistant from './AiAssistant'
import ViralFrameworks from './ViralFrameworks'
import './PostComposer.css'

export default function PostComposer({ onSaveDraft, onSchedule, onContentChange, onImageChange, onFirstCommentChange, aiEnabled }) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [charCount, setCharCount] = useState(0)
  const [firstComment, setFirstComment] = useState('')
  const textareaRef = useRef(null)

  const MAX_CHARS = 3000

  const handleContentChange = (e) => {
    const text = e.target.value
    if (text.length <= MAX_CHARS) {
      setContent(text)
      setCharCount(text.length)
      onContentChange?.(text)
    }
  }

  const handleTextChange = (newText) => {
    if (newText.length <= MAX_CHARS) {
      setContent(newText)
      setCharCount(newText.length)
      onContentChange?.(newText)
    }
  }

  const handleImageSelect = (base64) => {
    setImage(base64)
    onImageChange?.(base64)
  }

  const handleRemoveImage = () => {
    setImage(null)
    onImageChange?.(null)
  }

  const handleInsertHook = (hook) => {
    const newContent = content ? `${hook}\n\n${content}` : hook
    if (newContent.length <= MAX_CHARS) {
      setContent(newContent)
      setCharCount(newContent.length)
      onContentChange?.(newContent)
    }
  }

  const handleInsertEnding = (ending) => {
    const newContent = content ? `${content}\n\n${ending}` : ending
    if (newContent.length <= MAX_CHARS) {
      setContent(newContent)
      setCharCount(newContent.length)
      onContentChange?.(newContent)
    }
  }

  const handleAiContentUpdate = (newContent) => {
    if (newContent.length <= MAX_CHARS) {
      setContent(newContent)
      setCharCount(newContent.length)
      onContentChange?.(newContent)
    }
  }

  const handleAiFirstCommentUpdate = (newComment) => {
    setFirstComment(newComment)
    onFirstCommentChange?.(newComment)
  }

  const handleSaveDraft = () => {
    if (!content.trim()) {
      alert('Please write something first!')
      return
    }
    onSaveDraft(content, image, firstComment)
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

    onSchedule(content, image, scheduledTime, firstComment)
    resetForm()
  }

  const resetForm = () => {
    setContent('')
    setImage(null)
    setScheduleDate('')
    setScheduleTime('09:00')
    setCharCount(0)
    setFirstComment('')
    onContentChange?.('')
    onImageChange?.(null)
    onFirstCommentChange?.('')
  }

  return (
    <div className="post-composer">
      <h2>📝 Compose New Post</h2>

      <FormattingToolbar textareaRef={textareaRef} onTextChange={handleTextChange} />

      <textarea
        ref={textareaRef}
        className="post-textarea has-toolbar"
        placeholder="What's on your mind? Share your thoughts with your LinkedIn network..."
        value={content}
        onChange={handleContentChange}
      />

      <div className="char-count">
        {charCount} / {MAX_CHARS} characters
      </div>

      <HookTemplates
        onInsertHook={handleInsertHook}
        onInsertEnding={handleInsertEnding}
      />

      {aiEnabled && (
        <ViralFrameworks onContentUpdate={handleAiContentUpdate} />
      )}

      {aiEnabled && (
        <AiAssistant
          content={content}
          onContentUpdate={handleAiContentUpdate}
          onFirstCommentUpdate={handleAiFirstCommentUpdate}
        />
      )}

      <ImageUpload
        onImageSelect={handleImageSelect}
        currentImage={image}
        onRemove={handleRemoveImage}
      />

      <div className="first-comment-section">
        <h3>💬 First Comment (optional)</h3>
        <p className="first-comment-hint">
          Links in the first comment get better reach than links in the post body.
        </p>
        <textarea
          className="first-comment-textarea"
          placeholder="Add a first comment with your link, hashtags, or CTA..."
          value={firstComment}
          onChange={(e) => { setFirstComment(e.target.value); onFirstCommentChange?.(e.target.value) }}
        />
      </div>

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
