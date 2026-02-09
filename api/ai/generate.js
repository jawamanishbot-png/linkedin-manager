export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, systemPrompt, apiKey, model, maxTokens, temperature } = req.body

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' })
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
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
      const error = await response.json()
      return res.status(response.status).json({
        error: error.error?.message || 'Claude API request failed',
      })
    }

    const data = await response.json()
    res.json({ text: data.content[0].text })
  } catch (err) {
    console.error('AI proxy error:', err)
    res.status(500).json({ error: err.message || 'Failed to call Claude API' })
  }
}
