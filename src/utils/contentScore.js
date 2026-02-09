// Score a LinkedIn post based on best practices.
// Returns { score: 0-100, tips: string[] }

export function scorePost(content, firstComment) {
  if (!content || !content.trim()) {
    return { score: 0, tips: ['Start writing your post!'], grade: '-' }
  }

  const tips = []
  let score = 0
  const text = content.trim()
  const lines = text.split('\n').filter((l) => l.trim())
  const charCount = text.length
  const hashtagCount = (text.match(/#\w+/g) || []).length
  const emojiCount = (text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length
  const hasUrl = /https?:\/\/\S+/.test(text)
  const lineBreakCount = (text.match(/\n\s*\n/g) || []).length
  const firstLine = lines[0] || ''
  const lastLine = lines[lines.length - 1] || ''

  // 1. Hook quality (0-20 points)
  if (firstLine.length > 0 && firstLine.length <= 100) {
    score += 10
    if (/[?!:]$/.test(firstLine) || /^(I |Here|Stop|This|What|How|Why|The |Most |Don't)/.test(firstLine)) {
      score += 10
    } else {
      tips.push('Start with a strong hook — use a question, bold statement, or story opener')
    }
  } else if (firstLine.length > 100) {
    score += 5
    tips.push('Keep your opening line short and punchy (under 100 characters)')
  }

  // 2. Length (0-20 points) — sweet spot is 800-1800 chars
  if (charCount >= 800 && charCount <= 1800) {
    score += 20
  } else if (charCount >= 400 && charCount < 800) {
    score += 15
    tips.push('Longer posts (800-1800 chars) tend to get more engagement')
  } else if (charCount > 1800 && charCount <= 2500) {
    score += 15
  } else if (charCount < 400) {
    score += 8
    tips.push('Your post is quite short — aim for at least 800 characters')
  } else {
    score += 10
    tips.push('Very long posts can lose attention — consider trimming to under 2500 chars')
  }

  // 3. Readability / structure (0-15 points)
  if (lineBreakCount >= 2) {
    score += 15
  } else if (lineBreakCount === 1) {
    score += 10
    tips.push('Add more paragraph breaks for better readability')
  } else {
    score += 3
    tips.push('Break your post into short paragraphs with blank lines between them')
  }

  // 4. CTA / engagement driver (0-15 points)
  const ctaPatterns = /(\?$|comment|share|agree|thoughts|what do you think|let me know|drop a|tag someone|repost)/i
  if (ctaPatterns.test(lastLine)) {
    score += 15
  } else if (ctaPatterns.test(text)) {
    score += 10
    tips.push('Move your call-to-action to the last line for maximum impact')
  } else {
    tips.push('End with a question or call-to-action to drive engagement')
  }

  // 5. Hashtags (0-10 points) — 3-5 is optimal
  if (hashtagCount >= 3 && hashtagCount <= 5) {
    score += 10
  } else if (hashtagCount >= 1 && hashtagCount < 3) {
    score += 7
    tips.push('Use 3-5 hashtags for optimal reach')
  } else if (hashtagCount > 5) {
    score += 5
    tips.push('Too many hashtags can look spammy — stick to 3-5')
  } else {
    tips.push('Add 3-5 relevant hashtags to increase discoverability')
  }

  // 6. Emoji usage (0-5 points)
  if (emojiCount >= 1 && emojiCount <= 5) {
    score += 5
  } else if (emojiCount > 5) {
    score += 2
    tips.push('Too many emojis can be distracting — use 1-5 strategically')
  } else {
    score += 1
    tips.push('A few emojis can make your post more eye-catching')
  }

  // 7. No links in body (0-10 points)
  if (!hasUrl) {
    score += 10
  } else if (firstComment) {
    score += 7
    tips.push('Links in the post body hurt reach — you have a first comment, so move the link there')
  } else {
    score += 0
    tips.push('Links in the post body reduce reach by ~40% — move links to the first comment instead')
  }

  // 8. First comment bonus (0-5 points)
  if (firstComment && firstComment.trim()) {
    score += 5
  }

  // Cap at 100
  score = Math.min(score, 100)

  const grade = getGrade(score)

  return { score, tips, grade }
}

function getGrade(score) {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}
