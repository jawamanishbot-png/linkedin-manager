const STORAGE_KEY = 'linkedinAiConfig'

const PROVIDER_MODELS = {
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20250219', 'claude-3-haiku-20250307'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
}

export function getModelsForProvider(provider) {
  return PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini
}

// Get AI config from localStorage
export function getAiConfig() {
  try {
    const config = localStorage.getItem(STORAGE_KEY)
    return config ? JSON.parse(config) : getDefaultConfig()
  } catch (error) {
    console.error('Error reading AI config:', error)
    return getDefaultConfig()
  }
}

// Get default config
function getDefaultConfig() {
  return {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash',
    maxTokens: 1024,
    temperature: 0.7,
    enabled: false,
  }
}

// Save AI config
export function saveAiConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    return true
  } catch (error) {
    console.error('Error saving AI config:', error)
    return false
  }
}

// Check if user has a custom API key configured
export function hasCustomApiKey() {
  const config = getAiConfig()
  return config.apiKey.length > 0
}

// AI is always configured (server provides default key)
export function isAiConfigured() {
  return true
}

// Call AI API via backend proxy (avoids CORS)
export async function callClaudeApi(prompt, systemPrompt = '') {
  const config = getAiConfig()

  const body = {
    prompt,
    systemPrompt,
    provider: config.provider || 'gemini',
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  }

  // Only send apiKey if user has configured their own
  if (config.apiKey) {
    body.apiKey = config.apiKey
  }

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'AI request failed')
    }

    const data = await response.json()
    return data.text
  } catch (error) {
    console.error('AI API Error:', error)
    throw error
  }
}

// Generate post from topic
export async function generatePost(topic) {
  const prompt = `Generate a professional LinkedIn post about "${topic}".

  Requirements:
  - 2-3 paragraphs
  - Engaging and professional tone
  - Include a call-to-action
  - Use relevant LinkedIn best practices
  - Max 3000 characters

  Just return the post content, no extra text.`

  return await callClaudeApi(prompt)
}

// Generate hashtags for post
export async function generateHashtags(postContent) {
  const prompt = `Generate 5-8 relevant LinkedIn hashtags for this post. Return only the hashtags separated by spaces.

  Post: "${postContent}"`

  return await callClaudeApi(prompt)
}

// Rewrite post in different tone
export async function rewritePost(content, tone) {
  const prompt = `Rewrite this LinkedIn post in a ${tone} tone. Keep the main message but adjust the language and style.

  Original: "${content}"

  Just return the rewritten post, no extra text.`

  return await callClaudeApi(prompt)
}

// Improve post for engagement
export async function improvePost(content) {
  const prompt = `Analyze and improve this LinkedIn post for better engagement. Suggest improvements to:
  1. Hook/opening
  2. Call-to-action
  3. Formatting/readability
  4. Use of emoji

  Post: "${content}"

  Return the improved version.`

  return await callClaudeApi(prompt)
}

// Generate post ideas
export async function generatePostIdeas(topic) {
  const prompt = `Generate 5 creative LinkedIn post ideas about "${topic}".

  Format as:
  1. [Idea 1]
  2. [Idea 2]
  3. [Idea 3]
  4. [Idea 4]
  5. [Idea 5]

  Each should be 1-2 sentences describing the post concept.`

  return await callClaudeApi(prompt)
}

// Generate post from a viral framework
export async function generateFromFramework(topic, systemPrompt) {
  const prompt = `Generate a LinkedIn post about the following topic/context:

"${topic}"

Follow the structure and rules in your system instructions exactly. Return only the post content.`

  return await callClaudeApi(prompt, systemPrompt)
}

// Generate first comment suggestion
export async function generateFirstComment(postContent) {
  const prompt = `Generate an optimal first comment for this LinkedIn post. The comment should:
- Add value (a relevant insight, additional context, or thought-provoking question)
- Encourage engagement
- Be 1-3 sentences

Post: "${postContent}"

Just return the comment text, no extra text.`

  return await callClaudeApi(prompt)
}
