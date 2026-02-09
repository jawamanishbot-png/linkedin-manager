import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContentScore from '../ContentScore'

describe('ContentScore', () => {
  it('renders the header', () => {
    render(<ContentScore content="" firstComment="" />)
    expect(screen.getByText('Content Score')).toBeInTheDocument()
  })

  it('shows score of 0 for empty content', () => {
    render(<ContentScore content="" firstComment="" />)
    expect(screen.getByText('0/100')).toBeInTheDocument()
  })

  it('shows the dash grade for empty content', () => {
    render(<ContentScore content="" firstComment="" />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('shows tips for empty content', () => {
    render(<ContentScore content="" firstComment="" />)
    expect(screen.getByText('Start writing your post!')).toBeInTheDocument()
  })

  it('shows a non-zero score for real content', () => {
    render(<ContentScore content="Here is some real content for my LinkedIn post." firstComment="" />)
    expect(screen.queryByText('0/100')).not.toBeInTheDocument()
  })

  it('renders SVG ring element', () => {
    const { container } = render(<ContentScore content="Test" firstComment="" />)
    const svg = container.querySelector('svg.score-ring')
    expect(svg).toBeInTheDocument()
  })

  it('renders tip items with arrow bullets', () => {
    const { container } = render(<ContentScore content="Short" firstComment="" />)
    const tipBullets = container.querySelectorAll('.tip-bullet')
    expect(tipBullets.length).toBeGreaterThan(0)
  })

  it('handles null content gracefully', () => {
    render(<ContentScore content={null} firstComment={null} />)
    expect(screen.getByText('0/100')).toBeInTheDocument()
  })

  it('updates score when content changes', () => {
    const { rerender } = render(<ContentScore content="Short" firstComment="" />)
    const shortText = screen.getByText(/\/100/).textContent

    const longContent = [
      'I made a mistake that cost me everything.',
      '',
      'Three years ago, things were different.',
      '',
      'Here is what I learned from that experience and how it changed everything.',
      '',
      'What do you think?',
      '',
      '#career #growth #lessons',
    ].join('\n')

    rerender(<ContentScore content={longContent} firstComment="" />)
    const longText = screen.getByText(/\/100/).textContent

    expect(longText).not.toBe(shortText)
  })
})
