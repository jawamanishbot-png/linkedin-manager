import { useState, useRef, useEffect, useCallback } from 'react'
import { parseDateTime } from '../utils/dateUtils'
import { toBold, toItalic, toBulletList, toNumberedList, applyFormat } from '../utils/formatUtils'
import AiOutputPreview from './AiOutputPreview'
import AiPanel from './AiPanel'
import { useToast } from './ToastNotification'
import './PostComposer.css'

function CharRing({ current, max }) {
  const pct = Math.min(current / max, 1)
  const r = 14
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const warn = pct > 0.9
  const over = pct >= 1

  return (
    <div className="char-ring-wrapper" title={`${current} / ${max}`}>
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e8e8e8" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke={over ? '#ef4444' : warn ? '#f59e0b' : '#0a66c2'}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
          style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
        />
      </svg>
      {warn && <span className={`char-ring-count ${over ? 'over' : 'warn'}`}>{max - current}</span>}
    </div>
  )
}

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
  onAiResult,
  onInsertHook,
  onInsertEnding,
  onInsertTemplate,
  onFirstCommentResult,
}) {
  const textareaRef = useRef(null)
  const { showToast } = useToast()

  const [showFirstComment, setShowFirstComment] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showAi, setShowAi] = useState(false)

  const MAX_CHARS = 3000
  const charCount = content.length

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.max(160, ta.scrollHeight) + 'px'
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [content, autoResize])

  const handleContentChange = (e) => {
    const text = e.target.value
    if (text.length <= MAX_CHARS) {
      onContentChange(text)
    }
  }

  const handleFormat = (formatFn) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const result = applyFormat(textarea, formatFn)
    if (!result) return
    onContentChange(result.newText)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.newCursorPos, result.newCursorPos)
    })
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
    if (new Date(scheduledTime) <= new Date()) {
      showToast('Schedule time must be in the future!', 'warning')
      return
    }
    onSchedule(scheduledTime)
  }

  // Show first comment section if it already has content
  useEffect(() => {
    if (firstComment && !showFirstComment) setShowFirstComment(true)
  }, [firstComment, showFirstComment])

  return (
    <div className={`composer ${aiPreview ? 'composer--has-preview' : ''}`}>
      {/* LinkedIn-style header */}
      <div className="composer-profile">
        <div className="composer-avatar">
          <svg viewBox="0 0 24 24" fill="#666" width="28" height="28">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>
        <div className="composer-meta">
          <span className="composer-name">New Post</span>
          <span className="composer-visibility">Anyone</span>
        </div>
      </div>

      {/* Writing area */}
      <div className="composer-editor">
        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            className={`composer-textarea ${aiPreview ? 'composer-textarea--dimmed' : ''}`}
            placeholder="What do you want to talk about?"
            value={content}
            onChange={handleContentChange}
            disabled={!!aiPreview}
            rows={1}
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

        {/* Image preview inline */}
        {image && (
          <div className="composer-image-preview">
            <img src={image} alt="Preview" />
            <button className="composer-image-remove" onClick={() => onImageChange(null)}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="composer-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-icon-btn" title="Bold" onClick={() => handleFormat(toBold)}>
            <strong>B</strong>
          </button>
          <button className="toolbar-icon-btn toolbar-italic" title="Italic" onClick={() => handleFormat(toItalic)}>
            <em>I</em>
          </button>
          <button className="toolbar-icon-btn" title="Bullet list" onClick={() => handleFormat(toBulletList)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1h.01a1 1 0 010 2h-.01a1 1 0 01-1-1zm0 5.25a1 1 0 011-1h.01a1 1 0 010 2h-.01a1 1 0 01-1-1zm0 5.25a1 1 0 011-1h.01a1 1 0 010 2h-.01a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </button>
          <button className="toolbar-icon-btn" title="Numbered list" onClick={() => handleFormat(toNumberedList)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /><text x="1" y="6" fontSize="5.5" fontWeight="bold" fill="currentColor">1</text><text x="1" y="11.5" fontSize="5.5" fontWeight="bold" fill="currentColor">2</text><text x="1" y="17" fontSize="5.5" fontWeight="bold" fill="currentColor">3</text></svg>
          </button>

          <span className="toolbar-sep" />

          {/* Image upload */}
          <label className="toolbar-icon-btn" title="Add image">
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 5 * 1024 * 1024) { showToast('Image too large. Max 5MB.', 'error'); return }
              const reader = new FileReader()
              reader.onload = (ev) => onImageChange(ev.target?.result)
              reader.readAsDataURL(file)
              e.target.value = ''
            }} />
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 9.5c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.07l-2.72-2.72a.75.75 0 00-1.06 0l-3.22 3.22-1.72-1.72a.75.75 0 00-1.06 0L2.5 13.44v1.31zM14 8a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" /></svg>
          </label>

          {/* First comment toggle */}
          <button className={`toolbar-icon-btn ${showFirstComment ? 'active' : ''}`} title="First comment" onClick={() => setShowFirstComment(v => !v)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.102 41.102 0 01-3.55.414c-.28.02-.521.18-.643.413l-1.712 3.293a.75.75 0 01-1.33 0l-1.713-3.293a.783.783 0 00-.642-.413 41.108 41.108 0 01-3.55-.414C1.993 13.245 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z" clipRule="evenodd" /></svg>
          </button>

          {/* Schedule toggle */}
          <button className={`toolbar-icon-btn ${showSchedule ? 'active' : ''}`} title="Schedule" onClick={() => setShowSchedule(v => !v)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" /></svg>
          </button>

          <span className="toolbar-sep" />

          {/* AI toggle */}
          <button className={`toolbar-icon-btn toolbar-ai-btn ${showAi ? 'active' : ''}`} title="AI tools" onClick={() => setShowAi(v => !v)}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 1l2.39 6.37L19 9l-5.12 4.63L15.18 20 10 16.27 4.82 20l1.3-6.37L1 9l6.61-1.63L10 1z" /></svg>
            <span className="ai-label">AI</span>
          </button>
        </div>

        <div className="toolbar-right">
          {canUndo && (
            <button className="toolbar-icon-btn" title="Undo" onClick={onUndo}>
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" /></svg>
            </button>
          )}
          <CharRing current={charCount} max={MAX_CHARS} />
        </div>
      </div>

      {/* Embedded AI Panel */}
      {showAi && (
        <AiPanel
          content={content}
          onAiResult={onAiResult}
          onInsertHook={onInsertHook}
          onInsertEnding={onInsertEnding}
          onInsertTemplate={onInsertTemplate}
          onFirstCommentResult={onFirstCommentResult}
        />
      )}

      {/* Collapsible: First Comment */}
      {showFirstComment && (
        <div className="composer-panel">
          <div className="composer-panel-header">
            <span>First Comment</span>
            <span className="panel-hint">Links here get better reach</span>
          </div>
          <textarea
            className="composer-panel-input"
            placeholder="Add a first comment with your link, hashtags, or CTA..."
            value={firstComment}
            onChange={(e) => onFirstCommentChange(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Collapsible: Schedule */}
      {showSchedule && (
        <ScheduleSection onSchedule={handleSchedule} />
      )}

      {/* Action buttons */}
      <div className="composer-actions">
        <button className="composer-btn composer-btn--ghost" onClick={() => {
          onContentChange('')
          onImageChange(null)
          onFirstCommentChange('')
          showToast('Form cleared', 'info')
        }}>
          Clear
        </button>
        <button className="composer-btn composer-btn--secondary" onClick={handleSaveDraft}>
          Save Draft
        </button>
      </div>
    </div>
  )
}

function ScheduleSection({ onSchedule }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')

  return (
    <div className="composer-panel">
      <div className="composer-panel-header">
        <span>Schedule</span>
      </div>
      <div className="schedule-row">
        <input type="date" className="schedule-input" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" className="schedule-input" value={time} onChange={(e) => setTime(e.target.value)} />
        <button className="composer-btn composer-btn--primary composer-btn--sm" onClick={() => onSchedule(date, time)}>
          Schedule
        </button>
      </div>
    </div>
  )
}
