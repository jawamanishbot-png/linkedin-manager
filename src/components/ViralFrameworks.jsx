import { useState } from 'react'
import { VIRAL_FRAMEWORKS } from '../data/viralFrameworks'
import { generateFromFramework } from '../utils/aiUtils'
import './ViralFrameworks.css'

export default function ViralFrameworks({ onContentUpdate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState(null)
  const [topicInput, setTopicInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelectFramework = (framework) => {
    setSelectedFramework(framework)
    setTopicInput('')
    setError('')
  }

  const handleGenerate = async () => {
    if (!topicInput.trim() || !selectedFramework) return
    setLoading(true)
    setError('')
    try {
      const result = await generateFromFramework(
        topicInput.trim(),
        selectedFramework.systemPrompt
      )
      onContentUpdate(result)
      setTopicInput('')
      setSelectedFramework(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSelectedFramework(null)
    setTopicInput('')
    setError('')
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        className="frameworks-toggle-btn"
        onClick={() => setIsOpen(true)}
      >
        Viral Post Frameworks — 10 AI-powered templates for high-engagement posts
      </button>
    )
  }

  return (
    <div className="frameworks-panel">
      <div className="frameworks-header">
        <h4>Viral Post Frameworks</h4>
        <button type="button" className="frameworks-close" onClick={handleClose}>
          ✕
        </button>
      </div>

      {error && (
        <div className="frameworks-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>✕</button>
        </div>
      )}

      {loading && (
        <div className="frameworks-loading">
          <span className="frameworks-spinner" />
          Generating {selectedFramework?.name} post...
        </div>
      )}

      {!loading && (
        <>
          <div className="frameworks-grid">
            {VIRAL_FRAMEWORKS.map((fw) => (
              <button
                key={fw.id}
                type="button"
                className={`framework-chip ${selectedFramework?.id === fw.id ? 'active' : ''}`}
                onClick={() => handleSelectFramework(fw)}
              >
                {fw.icon} {fw.name}
              </button>
            ))}
          </div>

          {selectedFramework && (
            <div className="framework-detail">
              <p className="framework-description">{selectedFramework.description}</p>
              <div className="framework-input-group">
                <input
                  type="text"
                  placeholder={selectedFramework.placeholder}
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!topicInput.trim()}
                >
                  Generate Post
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
