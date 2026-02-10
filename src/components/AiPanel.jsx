import { useState } from 'react'
import { VIRAL_FRAMEWORKS } from '../data/viralFrameworks'
import { HOOKS, ENDINGS } from '../data/hookTemplates'
import {
  generatePost,
  generatePostIdeas,
  generateFromFramework,
  improvePost,
  rewritePost,
  generateHashtags,
  generateFirstComment,
} from '../utils/aiUtils'
import './AiPanel.css'

const TABS = [
  { id: 'generate', label: 'Generate' },
  { id: 'refine', label: 'Refine' },
  { id: 'templates', label: 'Templates' },
]

const TONES = ['Professional', 'Casual', 'Inspirational', 'Storytelling', 'Humorous']

export default function AiPanel({
  content,
  onAiResult,
  onInsertHook,
  onInsertEnding,
  onInsertTemplate,
  onFirstCommentResult,
}) {
  const [activeTab, setActiveTab] = useState('generate')
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const [error, setError] = useState('')

  // Generate tab state
  const [topicInput, setTopicInput] = useState('')
  const [selectedFramework, setSelectedFramework] = useState(null)
  const [frameworkTopic, setFrameworkTopic] = useState('')
  const [postIdeas, setPostIdeas] = useState('')

  // Templates tab state
  const [activeCategory, setActiveCategory] = useState(HOOKS[0].category)

  const hasContent = content && content.trim().length > 0

  const runAiAction = async (actionName, actionLabel, fn) => {
    setLoading(true)
    setActiveAction(actionName)
    setError('')
    try {
      const result = await fn()
      onAiResult(result, actionLabel, async () => {
        const retryResult = await fn()
        return retryResult
      })
    } catch (err) {
      setError(err.message || 'AI request failed')
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  // --- Generate tab handlers ---
  const handleGenerateFromTopic = () => {
    if (!topicInput.trim()) return
    runAiAction('generate', 'Generated Post', () => generatePost(topicInput))
  }

  const handleGetIdeas = async () => {
    if (!topicInput.trim()) return
    setLoading(true)
    setActiveAction('ideas')
    setError('')
    try {
      const ideas = await generatePostIdeas(topicInput)
      setPostIdeas(ideas)
    } catch (err) {
      setError(err.message || 'Failed to generate ideas')
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  const handleGenerateFromFramework = () => {
    if (!selectedFramework || !frameworkTopic.trim()) return
    runAiAction(
      'framework',
      `Generated: ${selectedFramework.name}`,
      () => generateFromFramework(frameworkTopic, selectedFramework.systemPrompt)
    )
  }

  const handleUseTemplate = () => {
    if (!selectedFramework?.template) return
    onInsertTemplate(selectedFramework.template)
    setSelectedFramework(null)
    setFrameworkTopic('')
  }

  // --- Refine tab handlers ---
  const handleImprove = () => {
    runAiAction('improve', 'Improved Post', () => improvePost(content))
  }

  const handlePunchier = () => {
    runAiAction('punchier', 'Made Punchier', () => rewritePost(content, 'punchy and bold with short impactful sentences'))
  }

  const handleShorten = () => {
    runAiAction('shorten', 'Shortened Post', () => rewritePost(content, 'concise — cut the length in half while keeping the key message'))
  }

  const handleAddHook = () => {
    runAiAction('hook', 'Added Hook', () => rewritePost(content, 'hook-focused — rewrite with a powerful scroll-stopping first line'))
  }

  const handleChangeTone = (tone) => {
    runAiAction('tone', `Rewritten (${tone})`, () => rewritePost(content, tone.toLowerCase()))
  }

  const handleAddHashtags = () => {
    runAiAction('hashtags', 'Added Hashtags', async () => {
      const hashtags = await generateHashtags(content)
      return content.trim() + '\n\n' + hashtags.trim()
    })
  }

  const handleSuggestComment = async () => {
    setLoading(true)
    setActiveAction('comment')
    setError('')
    try {
      const comment = await generateFirstComment(content)
      onFirstCommentResult(comment)
    } catch (err) {
      setError(err.message || 'Failed to generate comment')
    } finally {
      setLoading(false)
      setActiveAction(null)
    }
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`ai-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ai-panel-body">
        {error && (
          <div className="panel-error">
            {error}
            <button className="error-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="tab-generate">
            <div className="panel-section">
              <input
                type="text"
                className="panel-input"
                placeholder="Enter a topic (e.g., remote work, AI trends)"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateFromTopic()}
              />
              <div className="button-row">
                <button
                  className="panel-btn primary"
                  onClick={handleGenerateFromTopic}
                  disabled={loading || !topicInput.trim()}
                >
                  {activeAction === 'generate' ? 'Generating...' : 'Generate Post'}
                </button>
                <button
                  className="panel-btn secondary"
                  onClick={handleGetIdeas}
                  disabled={loading || !topicInput.trim()}
                >
                  {activeAction === 'ideas' ? 'Thinking...' : 'Get Ideas'}
                </button>
              </div>
            </div>

            {postIdeas && (
              <div className="ideas-box">
                <div className="ideas-box-header">
                  <span>Post Ideas</span>
                  <button onClick={() => setPostIdeas('')}>✕</button>
                </div>
                <div className="ideas-box-content">{postIdeas}</div>
              </div>
            )}

            <div className="panel-section">
              <label className="panel-label">Or use a framework</label>
              <div className="framework-chips">
                {VIRAL_FRAMEWORKS.map(fw => (
                  <button
                    key={fw.id}
                    className={`framework-chip ${selectedFramework?.id === fw.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFramework(selectedFramework?.id === fw.id ? null : fw)
                      setFrameworkTopic('')
                    }}
                  >
                    <span className="chip-icon">{fw.icon}</span>
                    <span className="chip-name">{fw.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedFramework && (
              <div className="framework-detail">
                <p className="framework-desc">{selectedFramework.description}</p>
                <input
                  type="text"
                  className="panel-input"
                  placeholder={selectedFramework.placeholder}
                  value={frameworkTopic}
                  onChange={(e) => setFrameworkTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateFromFramework()}
                />
                <div className="button-row">
                  <button
                    className="panel-btn primary"
                    onClick={handleGenerateFromFramework}
                    disabled={loading || !frameworkTopic.trim()}
                  >
                    {activeAction === 'framework' ? 'Generating...' : 'Generate with AI'}
                  </button>
                  {selectedFramework.template && (
                    <button
                      className="panel-btn secondary"
                      onClick={handleUseTemplate}
                    >
                      Use Template
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refine Tab */}
        {activeTab === 'refine' && (
          <div className="tab-refine">
            {!hasContent && (
              <p className="empty-hint">Write some content first, then use these tools to refine it.</p>
            )}

            <div className="panel-section">
              <label className="panel-label">Quick actions</label>
              <div className="action-chips">
                <button className="action-chip" onClick={handleImprove} disabled={loading || !hasContent}>
                  {activeAction === 'improve' ? 'Improving...' : 'Improve Post'}
                </button>
                <button className="action-chip" onClick={handlePunchier} disabled={loading || !hasContent}>
                  {activeAction === 'punchier' ? 'Working...' : 'Make it Punchier'}
                </button>
                <button className="action-chip" onClick={handleShorten} disabled={loading || !hasContent}>
                  {activeAction === 'shorten' ? 'Shortening...' : 'Shorten'}
                </button>
                <button className="action-chip" onClick={handleAddHook} disabled={loading || !hasContent}>
                  {activeAction === 'hook' ? 'Working...' : 'Add a Hook'}
                </button>
              </div>
            </div>

            <div className="panel-section">
              <label className="panel-label">Change tone</label>
              <div className="action-chips">
                {TONES.map(tone => (
                  <button
                    key={tone}
                    className="action-chip tone"
                    onClick={() => handleChangeTone(tone)}
                    disabled={loading || !hasContent}
                  >
                    {activeAction === 'tone' ? 'Rewriting...' : tone}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-section">
              <label className="panel-label">Extras</label>
              <div className="action-chips">
                <button className="action-chip" onClick={handleAddHashtags} disabled={loading || !hasContent}>
                  {activeAction === 'hashtags' ? 'Generating...' : 'Add Hashtags'}
                </button>
                <button className="action-chip" onClick={handleSuggestComment} disabled={loading || !hasContent}>
                  {activeAction === 'comment' ? 'Suggesting...' : 'Suggest First Comment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="tab-templates">
            <div className="panel-section">
              <label className="panel-label">Hook templates</label>
              <div className="hook-categories">
                {HOOKS.map(group => (
                  <button
                    key={group.category}
                    className={`category-chip ${activeCategory === group.category ? 'active' : ''}`}
                    onClick={() => setActiveCategory(group.category)}
                  >
                    {group.category}
                  </button>
                ))}
              </div>
              <div className="template-list">
                {HOOKS.find(h => h.category === activeCategory)?.hooks.map((hook, i) => (
                  <button key={i} className="template-item" onClick={() => onInsertHook(hook)}>
                    "{hook}"
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-section">
              <label className="panel-label">CTA / Endings</label>
              <div className="template-list">
                {ENDINGS.map((ending, i) => (
                  <button key={i} className="template-item ending" onClick={() => onInsertEnding(ending)}>
                    "{ending}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="panel-loading">
            <div className="loading-spinner" />
          </div>
        )}
      </div>
    </div>
  )
}
