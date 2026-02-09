import { useState } from 'react'
import {
  generatePost,
  generateHashtags,
  rewritePost,
  improvePost,
  generatePostIdeas,
  generateFirstComment,
} from '../utils/aiUtils'
import './AiAssistant.css'

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'inspirational', label: 'Inspirational' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'humorous', label: 'Humorous' },
]

export default function AiAssistant({ content, onContentUpdate, onFirstCommentUpdate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [error, setError] = useState('')
  const [topicInput, setTopicInput] = useState('')
  const [showTopicInput, setShowTopicInput] = useState(false)
  const [postIdeas, setPostIdeas] = useState('')
  const [showIdeas, setShowIdeas] = useState(false)
  const [showToneMenu, setShowToneMenu] = useState(false)

  const runAction = async (actionFn, actionName) => {
    setLoading(true)
    setActiveAction(actionName)
    setError('')
    try {
      await actionFn()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const handleGeneratePost = () => {
    if (!topicInput.trim()) return
    runAction(async () => {
      const result = await generatePost(topicInput)
      onContentUpdate(result)
      setTopicInput('')
      setShowTopicInput(false)
    }, 'generate')
  }

  const handleImprovePost = () => {
    if (!content.trim()) return
    runAction(async () => {
      const result = await improvePost(content)
      onContentUpdate(result)
    }, 'improve')
  }

  const handleRewritePost = (tone) => {
    if (!content.trim()) return
    setShowToneMenu(false)
    runAction(async () => {
      const result = await rewritePost(content, tone)
      onContentUpdate(result)
    }, 'rewrite')
  }

  const handleGenerateHashtags = () => {
    if (!content.trim()) return
    runAction(async () => {
      const hashtags = await generateHashtags(content)
      onContentUpdate(content.trim() + '\n\n' + hashtags.trim())
    }, 'hashtags')
  }

  const handleGenerateFirstComment = () => {
    if (!content.trim()) return
    runAction(async () => {
      const comment = await generateFirstComment(content)
      onFirstCommentUpdate(comment)
    }, 'firstComment')
  }

  const handleGenerateIdeas = () => {
    if (!topicInput.trim()) return
    runAction(async () => {
      const ideas = await generatePostIdeas(topicInput)
      setPostIdeas(ideas)
      setShowIdeas(true)
    }, 'ideas')
  }

  const handleClose = () => {
    setIsOpen(false)
    setShowToneMenu(false)
    setShowTopicInput(false)
    setShowIdeas(false)
    setError('')
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="ai-toggle-btn"
        onClick={() => setIsOpen(true)}
      >
        AI Assistant — Generate, improve, and rewrite with Claude
      </button>
    )
  }

  const hasContent = content && content.trim().length > 0

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h4>AI Assistant</h4>
        <button type="button" className="ai-close" onClick={handleClose}>
          ✕
        </button>
      </div>

      {error && (
        <div className="ai-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {loading && (
        <div className="ai-loading">
          <span className="ai-spinner" />
          {activeAction === 'generate' && 'Generating post...'}
          {activeAction === 'improve' && 'Improving post...'}
          {activeAction === 'rewrite' && 'Rewriting post...'}
          {activeAction === 'hashtags' && 'Generating hashtags...'}
          {activeAction === 'firstComment' && 'Generating first comment...'}
          {activeAction === 'ideas' && 'Generating ideas...'}
        </div>
      )}

      <div className="ai-actions">
        <div className="ai-action-group">
          <button
            type="button"
            className="ai-action-btn"
            onClick={() => { setShowTopicInput(!showTopicInput); setShowIdeas(false); setShowToneMenu(false) }}
            disabled={loading}
          >
            Generate Post
          </button>
          {showTopicInput && (
            <div className="ai-input-group">
              <input
                type="text"
                placeholder="Enter a topic or prompt..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePost()}
                disabled={loading}
              />
              <div className="ai-input-actions">
                <button type="button" onClick={handleGeneratePost} disabled={loading || !topicInput.trim()}>
                  Generate
                </button>
                <button type="button" onClick={handleGenerateIdeas} disabled={loading || !topicInput.trim()}>
                  Get Ideas
                </button>
              </div>
            </div>
          )}
        </div>

        {showIdeas && postIdeas && (
          <div className="ai-ideas">
            <h5>Post Ideas</h5>
            <pre className="ai-ideas-text">{postIdeas}</pre>
          </div>
        )}

        <button
          type="button"
          className="ai-action-btn"
          onClick={handleImprovePost}
          disabled={loading || !hasContent}
          title={!hasContent ? 'Write some content first' : 'Improve post for engagement'}
        >
          Improve Post
        </button>

        <div className="ai-action-group">
          <button
            type="button"
            className="ai-action-btn"
            onClick={() => { setShowToneMenu(!showToneMenu); setShowTopicInput(false); setShowIdeas(false) }}
            disabled={loading || !hasContent}
            title={!hasContent ? 'Write some content first' : 'Rewrite in a different tone'}
          >
            Rewrite Tone
          </button>
          {showToneMenu && (
            <div className="ai-tone-menu">
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  className="ai-tone-btn"
                  onClick={() => handleRewritePost(tone.id)}
                  disabled={loading}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="ai-action-btn"
          onClick={handleGenerateHashtags}
          disabled={loading || !hasContent}
          title={!hasContent ? 'Write some content first' : 'Generate relevant hashtags'}
        >
          Add Hashtags
        </button>

        <button
          type="button"
          className="ai-action-btn"
          onClick={handleGenerateFirstComment}
          disabled={loading || !hasContent}
          title={!hasContent ? 'Write some content first' : 'Generate a first comment'}
        >
          Suggest First Comment
        </button>
      </div>
    </div>
  )
}
