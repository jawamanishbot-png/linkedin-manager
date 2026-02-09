import { toBold, toItalic, toBulletList, toNumberedList, applyFormat } from '../utils/formatUtils'
import './FormattingToolbar.css'

export default function FormattingToolbar({ textareaRef, onTextChange }) {
  const handleFormat = (formatFn) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const result = applyFormat(textarea, formatFn)
    if (!result) return

    onTextChange(result.newText)

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(result.newCursorPos, result.newCursorPos)
    })
  }

  return (
    <div className="formatting-toolbar">
      <button
        type="button"
        className="format-btn"
        onClick={() => handleFormat(toBold)}
        title="Bold (select text first)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className="format-btn italic"
        onClick={() => handleFormat(toItalic)}
        title="Italic (select text first)"
      >
        <em>I</em>
      </button>
      <span className="toolbar-divider" />
      <button
        type="button"
        className="format-btn"
        onClick={() => handleFormat(toBulletList)}
        title="Bullet list (select lines)"
      >
        &#8226; List
      </button>
      <button
        type="button"
        className="format-btn"
        onClick={() => handleFormat(toNumberedList)}
        title="Numbered list (select lines)"
      >
        1. List
      </button>
      <span className="toolbar-hint">Select text, then format</span>
    </div>
  )
}
