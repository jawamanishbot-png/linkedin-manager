import { useState } from 'react'
import './HookTemplates.css'

const HOOKS = [
  { category: 'Story', hooks: [
    'I made a mistake that cost me everything.',
    '5 years ago, I was broke and stuck.',
    'Nobody believed me when I said this.',
    'I got fired. Best thing that ever happened to me.',
    'The worst advice I ever received:',
  ]},
  { category: 'Curiosity', hooks: [
    'Stop scrolling. This will change how you think about',
    'Here\'s what nobody tells you about',
    'I analyzed 1,000+ LinkedIn posts. Here\'s what I found:',
    'The #1 reason most people fail at',
    'This one habit separates top performers from everyone else:',
  ]},
  { category: 'Contrarian', hooks: [
    'Unpopular opinion:',
    'Hot take:',
    'Everyone says you should do X. They\'re wrong.',
    'I\'m going to say something controversial.',
    'The truth about [topic] that nobody wants to hear:',
  ]},
  { category: 'Listicle', hooks: [
    '7 lessons I learned the hard way:',
    '5 tools that 10x\'d my productivity:',
    '10 things I wish I knew at 25:',
    '3 books that changed my career:',
    'Here are 8 signs you\'re on the right path:',
  ]},
  { category: 'Question', hooks: [
    'What would you do if you couldn\'t fail?',
    'Why do we keep doing [thing] when we know it doesn\'t work?',
    'When was the last time you took a risk?',
    'What\'s the best career advice you\'ve ever received?',
    'Am I the only one who thinks this?',
  ]},
]

const ENDINGS = [
  'What do you think? Drop your thoughts below.',
  'Agree or disagree? Let me know in the comments.',
  'Share this with someone who needs to hear it.',
  'Follow me for more insights like this.',
  'If this resonated, repost to help others.',
  'What would you add to this list?',
  'Tag someone who needs to see this.',
  'Save this for later. You\'ll thank me.',
]

export default function HookTemplates({ onInsertHook, onInsertEnding }) {
  const [showHooks, setShowHooks] = useState(false)
  const [activeCategory, setActiveCategory] = useState(HOOKS[0].category)

  if (!showHooks) {
    return (
      <button
        type="button"
        className="hooks-toggle-btn"
        onClick={() => setShowHooks(true)}
      >
        Hook & CTA Templates
      </button>
    )
  }

  const activeHooks = HOOKS.find((h) => h.category === activeCategory)

  return (
    <div className="hooks-panel">
      <div className="hooks-header">
        <h4>Hook Templates</h4>
        <button
          type="button"
          className="hooks-close"
          onClick={() => setShowHooks(false)}
        >
          ✕
        </button>
      </div>

      <div className="hooks-categories">
        {HOOKS.map((group) => (
          <button
            key={group.category}
            className={`category-btn ${activeCategory === group.category ? 'active' : ''}`}
            onClick={() => setActiveCategory(group.category)}
          >
            {group.category}
          </button>
        ))}
      </div>

      <div className="hooks-list">
        {activeHooks?.hooks.map((hook, i) => (
          <button
            key={i}
            className="hook-item"
            onClick={() => onInsertHook(hook)}
            title="Click to insert at the beginning"
          >
            "{hook}"
          </button>
        ))}
      </div>

      <div className="endings-section">
        <h4>CTA / Ending Templates</h4>
        <div className="hooks-list">
          {ENDINGS.map((ending, i) => (
            <button
              key={i}
              className="hook-item ending"
              onClick={() => onInsertEnding(ending)}
              title="Click to append at the end"
            >
              "{ending}"
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
