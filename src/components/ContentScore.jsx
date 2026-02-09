import { scorePost } from '../utils/contentScore'
import './ContentScore.css'

export default function ContentScore({ content, firstComment }) {
  const { score, tips, grade } = scorePost(content, firstComment)

  const getScoreColor = () => {
    if (score >= 80) return '#16a34a'
    if (score >= 60) return '#ca8a04'
    if (score >= 40) return '#ea580c'
    return '#dc2626'
  }

  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="content-score">
      <div className="score-header">
        <h3>Content Score</h3>
      </div>

      <div className="score-display">
        <svg className="score-ring" width="90" height="90" viewBox="0 0 90 90">
          <circle
            cx="45" cy="45" r="36"
            fill="none" stroke="#e0e0e0" strokeWidth="6"
          />
          <circle
            cx="45" cy="45" r="36"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="score-value">
          <span className="score-grade" style={{ color: getScoreColor() }}>{grade}</span>
          <span className="score-number">{score}/100</span>
        </div>
      </div>

      {tips.length > 0 && (
        <div className="score-tips">
          {tips.map((tip, i) => (
            <div key={i} className="tip-item">
              <span className="tip-bullet">&#x2192;</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
