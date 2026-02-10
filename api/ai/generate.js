export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, systemPrompt, apiKey, model, maxTokens, temperature, provider } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const resolvedProvider = provider || 'gemini'

  try {
    let text

    if (resolvedProvider === 'gemini') {
      text = await callGemini({ prompt, systemPrompt, apiKey, model, maxTokens, temperature })
    } else if (resolvedProvider === 'openai') {
      text = await callOpenAI({ prompt, systemPrompt, apiKey, model, maxTokens, temperature })
    } else {
      text = await callClaude({ prompt, systemPrompt, apiKey, model, maxTokens, temperature })
    }

    res.json({ text })
  } catch (err) {
    console.error('AI proxy error:', err)
    const status = err.status || 500
    res.status(status).json({ error: err.message || 'AI request failed' })
  }
}

async function callGemini({ prompt, systemPrompt, apiKey, model, maxTokens, temperature }) {
  const resolvedKey = apiKey || process.env.GEMINI_API_KEY
  if (!resolvedKey) {
    throw Object.assign(new Error('No Gemini API key available. Please configure your own key in settings.'), { status: 400 })
  }

  const resolvedModel = model || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${resolvedKey}`

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens || 1024,
    },
  }

  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw Object.assign(
      new Error(error.error?.message || `Gemini API error: ${response.status}`),
      { status: response.status }
    )
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

async function callClaude({ prompt, systemPrompt, apiKey, model, maxTokens, temperature }) {
  const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY
  if (!resolvedKey) {
    throw Object.assign(new Error('No Claude API key available. Please configure your own key in settings.'), { status: 400 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': resolvedKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens || 1024,
      temperature: temperature ?? 0.7,
      system: systemPrompt || '',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw Object.assign(
      new Error(error.error?.message || `Claude API error: ${response.status}`),
      { status: response.status }
    )
  }

  const data = await response.json()
  return data.content[0].text
}

async function callOpenAI({ prompt, systemPrompt, apiKey, model, maxTokens, temperature }) {
  const resolvedKey = apiKey || process.env.OPENAI_API_KEY
  if (!resolvedKey) {
    throw Object.assign(new Error('No OpenAI API key available. Please configure your own key in settings.'), { status: 400 })
  }

  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resolvedKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      max_tokens: maxTokens || 1024,
      temperature: temperature ?? 0.7,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw Object.assign(
      new Error(error.error?.message || `OpenAI API error: ${response.status}`),
      { status: response.status }
    )
  }

  const data = await response.json()
  return data.choices[0].message.content
}
