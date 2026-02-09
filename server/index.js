import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import 'dotenv/config'
import {
  getSession,
  setSessionCookie,
  clearSessionCookie,
} from '../api/_lib/session.js'

const app = express()
const PORT = process.env.PORT || 3001

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET
const LINKEDIN_REDIRECT_URI =
  process.env.LINKEDIN_REDIRECT_URI ||
  `http://localhost:${PORT}/api/auth/linkedin/callback`
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// --- OAuth Routes ---

// 1. Initiate LinkedIn OAuth
app.get('/api/auth/linkedin', (req, res) => {
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'LinkedIn credentials not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.',
    })
  }

  const state = crypto.randomUUID()

  // Store state in encrypted cookie
  setSessionCookie(res, { oauthState: state, expiresAt: Date.now() + 10 * 60 * 1000 })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    state,
    scope: 'openid profile email w_member_social',
  })

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
})

// 2. OAuth callback
app.get('/api/auth/linkedin/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}?linkedin_error=${encodeURIComponent(error)}`)
  }

  const session = getSession(req)
  if (!session || !session.oauthState || session.oauthState !== state) {
    return res.redirect(`${FRONTEND_URL}?linkedin_error=state_mismatch`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
          redirect_uri: LINKEDIN_REDIRECT_URI,
        }),
      }
    )

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return res.redirect(`${FRONTEND_URL}?linkedin_error=token_exchange_failed`)
    }

    // Fetch user profile
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )

    const profile = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error('Profile fetch failed:', profile)
      return res.redirect(`${FRONTEND_URL}?linkedin_error=profile_fetch_failed`)
    }

    // Store in encrypted cookie
    setSessionCookie(res, {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      profile: {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      },
    })

    res.redirect(`${FRONTEND_URL}?linkedin_connected=true`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.redirect(`${FRONTEND_URL}?linkedin_error=server_error`)
  }
})

// 3. Check authentication status
app.get('/api/auth/linkedin/status', (req, res) => {
  const session = getSession(req)
  if (session && session.accessToken && session.expiresAt > Date.now()) {
    res.json({ connected: true, profile: session.profile })
  } else {
    res.json({ connected: false })
  }
})

// 4. Disconnect LinkedIn
app.post('/api/auth/linkedin/disconnect', (_req, res) => {
  clearSessionCookie(res)
  res.json({ success: true })
})

// --- Publish Route ---

app.post('/api/linkedin/publish', async (req, res) => {
  const session = getSession(req)
  if (!session || !session.accessToken || session.expiresAt <= Date.now()) {
    return res.status(401).json({ error: 'Not authenticated with LinkedIn. Please connect first.' })
  }

  const { content, image } = req.body
  const { accessToken, profile } = session
  const authorUrn = `urn:li:person:${profile.id}`

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Post content is required' })
  }

  try {
    let mediaAsset = null

    if (image) {
      mediaAsset = await uploadImage(accessToken, authorUrn, image)
    }

    const postPayload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
          ...(mediaAsset && {
            media: [{ status: 'READY', media: mediaAsset }],
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    const publishResponse = await fetch(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postPayload),
      }
    )

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}))
      console.error('LinkedIn publish error:', errorData)
      throw new Error(errorData.message || `LinkedIn API error: ${publishResponse.status}`)
    }

    const postId = publishResponse.headers.get('x-restli-id')
    res.json({ success: true, postId })
  } catch (err) {
    console.error('Publish error:', err)
    res.status(500).json({ error: err.message || 'Failed to publish post' })
  }
})

// --- Image Upload Helper ---

async function uploadImage(accessToken, ownerUrn, base64Image) {
  const registerResponse = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }),
    }
  )

  if (!registerResponse.ok) {
    const err = await registerResponse.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to register image upload')
  }

  const registerData = await registerResponse.json()
  const uploadUrl =
    registerData.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl
  const asset = registerData.value.asset

  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
  const imageBuffer = Buffer.from(base64Data, 'base64')

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload image to LinkedIn')
  }

  return asset
}

// --- Fetch User Posts Route ---

app.get('/api/linkedin/posts', async (req, res) => {
  const session = getSession(req)
  if (!session || !session.accessToken || session.expiresAt <= Date.now()) {
    return res.status(401).json({ error: 'Not authenticated with LinkedIn. Please connect first.' })
  }

  const { accessToken, profile } = session
  const authorUrn = `urn:li:person:${profile.id}`
  const count = Math.min(parseInt(req.query.count) || 20, 50)
  const start = parseInt(req.query.start) || 0

  try {
    const params = new URLSearchParams({
      q: 'author',
      author: authorUrn,
      count: String(count),
      start: String(start),
      sortBy: 'LAST_MODIFIED',
    })

    const postsResponse = await fetch(
      `https://api.linkedin.com/rest/posts?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202501',
        },
      }
    )

    if (!postsResponse.ok) {
      const errorData = await postsResponse.json().catch(() => ({}))
      if (postsResponse.status === 403) {
        return res.status(403).json({
          error: 'Your LinkedIn app does not have permission to read posts. The r_member_social scope is required.',
          scopeRequired: 'r_member_social',
        })
      }
      throw new Error(errorData.message || `LinkedIn API error: ${postsResponse.status}`)
    }

    const data = await postsResponse.json()
    const posts = (data.elements || []).map((post) => ({
      id: post.id,
      text: post.commentary || '',
      visibility: post.visibility,
      createdAt: post.createdAt,
      lastModifiedAt: post.lastModifiedAt,
      lifecycleState: post.lifecycleState,
      hasMedia: !!(post.content && Object.keys(post.content).length > 0),
    }))

    res.json({
      posts,
      paging: { start, count, total: data.paging?.total },
    })
  } catch (err) {
    console.error('Fetch posts error:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch posts from LinkedIn' })
  }
})

// --- AI Proxy Route ---

app.post('/api/ai/generate', async (req, res) => {
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
})

// Start server
app.listen(PORT, () => {
  console.log(`LinkedIn Manager API server running on http://localhost:${PORT}`)
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    console.warn(
      'WARNING: LINKEDIN_CLIENT_ID and/or LINKEDIN_CLIENT_SECRET not set. OAuth will not work.'
    )
    console.warn('Copy .env.example to .env and fill in your credentials.')
  }
})
