import { describe, it, expect } from 'vitest'
import {
  toBold,
  toItalic,
  toBulletList,
  toNumberedList,
  applyFormat,
  addLineBreaks,
} from '../formatUtils'

describe('toBold', () => {
  it('converts lowercase letters to bold Unicode', () => {
    expect(toBold('abc')).toBe('𝗮𝗯𝗰')
  })

  it('converts uppercase letters to bold Unicode', () => {
    expect(toBold('ABC')).toBe('𝗔𝗕𝗖')
  })

  it('converts digits to bold Unicode', () => {
    expect(toBold('123')).toBe('𝟭𝟮𝟯')
  })

  it('preserves non-alphanumeric characters', () => {
    expect(toBold('hi!')).toBe('𝗵𝗶!')
    expect(toBold('a b')).toBe('𝗮 𝗯')
  })

  it('handles empty string', () => {
    expect(toBold('')).toBe('')
  })

  it('handles mixed case and numbers', () => {
    expect(toBold('Test123')).toBe('𝗧𝗲𝘀𝘁𝟭𝟮𝟯')
  })
})

describe('toItalic', () => {
  it('converts lowercase letters to italic Unicode', () => {
    expect(toItalic('abc')).toBe('𝘢𝘣𝘤')
  })

  it('converts uppercase letters to italic Unicode', () => {
    expect(toItalic('ABC')).toBe('𝘈𝘉𝘊')
  })

  it('preserves numbers (no italic digits in map)', () => {
    expect(toItalic('a1b')).toBe('𝘢1𝘣')
  })

  it('handles empty string', () => {
    expect(toItalic('')).toBe('')
  })
})

describe('toBulletList', () => {
  it('adds bullet points to each line', () => {
    expect(toBulletList('item one\nitem two')).toBe('• item one\n• item two')
  })

  it('preserves existing bullet points', () => {
    expect(toBulletList('• already\nnew')).toBe('• already\n• new')
  })

  it('handles empty lines', () => {
    expect(toBulletList('first\n\nthird')).toBe('• first\n\n• third')
  })

  it('trims whitespace from lines', () => {
    expect(toBulletList('  indented  ')).toBe('• indented')
  })

  it('handles single line', () => {
    expect(toBulletList('single')).toBe('• single')
  })
})

describe('toNumberedList', () => {
  it('adds numbers to each line', () => {
    expect(toNumberedList('first\nsecond\nthird')).toBe('1. first\n2. second\n3. third')
  })

  it('preserves existing numbered lines without incrementing counter', () => {
    // Preserved lines don't consume a number, so counter stays at 1
    expect(toNumberedList('1. already\nnew')).toBe('1. already\n1. new')
  })

  it('handles empty lines (skips numbering)', () => {
    expect(toNumberedList('first\n\nthird')).toBe('1. first\n\n2. third')
  })

  it('handles single line', () => {
    expect(toNumberedList('only')).toBe('1. only')
  })
})

describe('applyFormat', () => {
  it('applies format function to selected text', () => {
    const textarea = {
      value: 'hello world',
      selectionStart: 6,
      selectionEnd: 11,
    }
    const result = applyFormat(textarea, toBold)
    expect(result.newText).toBe('hello 𝘄𝗼𝗿𝗹𝗱')
    expect(result.newCursorPos).toBe(6 + '𝘄𝗼𝗿𝗹𝗱'.length)
  })

  it('returns null when no text is selected', () => {
    const textarea = {
      value: 'hello',
      selectionStart: 3,
      selectionEnd: 3,
    }
    expect(applyFormat(textarea, toBold)).toBeNull()
  })

  it('works with selection at beginning', () => {
    const textarea = {
      value: 'hello world',
      selectionStart: 0,
      selectionEnd: 5,
    }
    const result = applyFormat(textarea, toBold)
    expect(result.newText).toContain('𝗵𝗲𝗹𝗹𝗼')
    expect(result.newText).toContain(' world')
  })

  it('works with full text selection', () => {
    const textarea = {
      value: 'hi',
      selectionStart: 0,
      selectionEnd: 2,
    }
    const result = applyFormat(textarea, toItalic)
    expect(result.newText).toBe('𝘩𝘪')
  })
})

describe('addLineBreaks', () => {
  it('doubles newlines', () => {
    expect(addLineBreaks('a\nb\nc')).toBe('a\n\nb\n\nc')
  })

  it('handles text without newlines', () => {
    expect(addLineBreaks('no breaks')).toBe('no breaks')
  })

  it('handles empty string', () => {
    expect(addLineBreaks('')).toBe('')
  })
})
