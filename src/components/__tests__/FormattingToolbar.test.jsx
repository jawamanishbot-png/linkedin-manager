import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormattingToolbar from '../FormattingToolbar'

describe('FormattingToolbar', () => {
  const createMockRef = (value = '', selectionStart = 0, selectionEnd = 0) => ({
    current: {
      value,
      selectionStart,
      selectionEnd,
      focus: vi.fn(),
      setSelectionRange: vi.fn(),
    },
  })

  it('renders all formatting buttons', () => {
    const ref = createMockRef()
    render(<FormattingToolbar textareaRef={ref} onTextChange={vi.fn()} />)

    expect(screen.getByTitle('Bold (select text first)')).toBeInTheDocument()
    expect(screen.getByTitle('Italic (select text first)')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet list (select lines)')).toBeInTheDocument()
    expect(screen.getByTitle('Numbered list (select lines)')).toBeInTheDocument()
  })

  it('renders the hint text', () => {
    const ref = createMockRef()
    render(<FormattingToolbar textareaRef={ref} onTextChange={vi.fn()} />)
    expect(screen.getByText('Select text, then format')).toBeInTheDocument()
  })

  it('calls onTextChange with bold text when Bold is clicked with selection', async () => {
    const user = userEvent.setup()
    const onTextChange = vi.fn()
    const ref = createMockRef('hello world', 0, 5)

    render(<FormattingToolbar textareaRef={ref} onTextChange={onTextChange} />)

    await user.click(screen.getByTitle('Bold (select text first)'))
    expect(onTextChange).toHaveBeenCalledWith(expect.stringContaining('𝗵𝗲𝗹𝗹𝗼'))
  })

  it('calls onTextChange with italic text when Italic is clicked with selection', async () => {
    const user = userEvent.setup()
    const onTextChange = vi.fn()
    const ref = createMockRef('hello world', 0, 5)

    render(<FormattingToolbar textareaRef={ref} onTextChange={onTextChange} />)

    await user.click(screen.getByTitle('Italic (select text first)'))
    expect(onTextChange).toHaveBeenCalledWith(expect.stringContaining('𝘩𝘦𝘭𝘭𝘰'))
  })

  it('does not call onTextChange when no text is selected', async () => {
    const user = userEvent.setup()
    const onTextChange = vi.fn()
    const ref = createMockRef('hello world', 3, 3)

    render(<FormattingToolbar textareaRef={ref} onTextChange={onTextChange} />)

    await user.click(screen.getByTitle('Bold (select text first)'))
    expect(onTextChange).not.toHaveBeenCalled()
  })

  it('does nothing when textareaRef.current is null', async () => {
    const user = userEvent.setup()
    const onTextChange = vi.fn()
    const ref = { current: null }

    render(<FormattingToolbar textareaRef={ref} onTextChange={onTextChange} />)

    await user.click(screen.getByTitle('Bold (select text first)'))
    expect(onTextChange).not.toHaveBeenCalled()
  })

  it('calls onTextChange with bullet list when Bullet List is clicked', async () => {
    const user = userEvent.setup()
    const onTextChange = vi.fn()
    const ref = createMockRef('item one\nitem two', 0, 17)

    render(<FormattingToolbar textareaRef={ref} onTextChange={onTextChange} />)

    await user.click(screen.getByTitle('Bullet list (select lines)'))
    expect(onTextChange).toHaveBeenCalledWith(expect.stringContaining('• item one'))
  })

  it('calls onTextChange with numbered list when Numbered List is clicked', async () => {
    const user = userEvent.setup()
    const onTextChange = vi.fn()
    const ref = createMockRef('first\nsecond', 0, 12)

    render(<FormattingToolbar textareaRef={ref} onTextChange={onTextChange} />)

    await user.click(screen.getByTitle('Numbered list (select lines)'))
    expect(onTextChange).toHaveBeenCalledWith(expect.stringContaining('1. first'))
  })
})
