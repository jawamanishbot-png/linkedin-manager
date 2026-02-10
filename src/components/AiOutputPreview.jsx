import { useEffect } from 'react'
import './AiOutputPreview.css'

export default function AiOutputPreview({
  originalContent,
  aiContent,
  actionLabel,
  onAccept,
  onDiscard,
  onRetry,
  isRetrying,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onDiscard()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDiscard])

  return (
    <div className="ai-output-preview">
      <div className="ai-output-header">
        <span>{actionLabel}</span>
        <button
          className="btn-retry"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
      <div className="ai-output-body">
        {aiContent}
      </div>
      <div className="ai-output-actions">
        <button className="btn btn-discard" onClick={onDiscard}>
          {originalContent ? 'Discard' : 'Start Over'}
        </button>
        <button className="btn btn-accept" onClick={onAccept}>
          Accept Changes
        </button>
      </div>
    </div>
  )
}
