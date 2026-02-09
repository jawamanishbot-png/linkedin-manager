import { describe, it, expect } from 'vitest'
import { scorePost } from '../contentScore'

describe('scorePost', () => {
  it('returns zero score for empty content', () => {
    const result = scorePost('', '')
    expect(result.score).toBe(0)
    expect(result.grade).toBe('-')
    expect(result.tips).toContain('Start writing your post!')
  })

  it('returns zero score for null content', () => {
    const result = scorePost(null)
    expect(result.score).toBe(0)
  })

  it('returns zero score for whitespace-only content', () => {
    const result = scorePost('   ')
    expect(result.score).toBe(0)
  })

  it('scores a well-crafted post highly', () => {
    const content = [
      'I made a mistake that cost me everything.',
      '',
      'Three years ago, I was running a startup. We had funding, a great team, and a product people loved.',
      '',
      'But I made one critical error: I stopped listening to my customers.',
      '',
      'Here are the 5 lessons I learned:',
      '',
      '1. Always prioritize customer feedback over internal assumptions',
      '2. Schedule regular user interviews — at least monthly',
      '3. Build feedback loops into your product',
      '4. Let data drive decisions, not ego',
      '5. Stay humble no matter how well things are going',
      '',
      'The good news? It\'s never too late to course-correct.',
      '',
      'What\'s the biggest lesson you\'ve learned from failure? 🚀',
      '',
      '#startup #entrepreneurship #lessons #growth #business',
    ].join('\n')

    const result = scorePost(content, 'Check out my full article: https://example.com')
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.grade).toMatch(/^[AB]/)
  })

  it('gives lower score for very short posts', () => {
    const result = scorePost('Hello world')
    expect(result.score).toBeLessThan(50)
    expect(result.tips.length).toBeGreaterThan(0)
  })

  it('penalizes links in the post body', () => {
    const withUrl = scorePost('Check out my article here https://example.com and let me know what you think?')
    const withoutUrl = scorePost('Check out my article here and let me know what you think?')
    expect(withoutUrl.score).toBeGreaterThan(withUrl.score)
  })

  it('gives bonus for first comment', () => {
    const withComment = scorePost('Some post content here', 'Link: https://example.com')
    const withoutComment = scorePost('Some post content here')
    expect(withComment.score).toBeGreaterThan(withoutComment.score)
  })

  it('rewards good hashtag count (3-5)', () => {
    const content = 'Good post here\n\n#one #two #three'
    const result = scorePost(content)
    const noHashtags = scorePost('Good post here')
    expect(result.score).toBeGreaterThan(noHashtags.score)
  })

  it('provides tips for too many hashtags', () => {
    const content = 'Post #one #two #three #four #five #six #seven'
    const result = scorePost(content)
    expect(result.tips.some((t) => t.toLowerCase().includes('hashtag'))).toBe(true)
  })

  it('returns valid grade for all score ranges', () => {
    // Zero content
    expect(scorePost('').grade).toBe('-')

    // Create posts with varying quality
    const shortPost = scorePost('Hi')
    expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(shortPost.grade)
  })

  it('tips is always an array', () => {
    expect(Array.isArray(scorePost('').tips)).toBe(true)
    expect(Array.isArray(scorePost('A real post content').tips)).toBe(true)
  })

  it('score is always between 0 and 100', () => {
    const testCases = [
      '',
      'Short',
      'A'.repeat(3000),
      'Post with #hashtags #everywhere #on #every #word #seriously #too #many',
      'Post with emojis 🚀🎯💡🔥⚡️🎉',
    ]
    testCases.forEach((content) => {
      const { score } = scorePost(content)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })
})
