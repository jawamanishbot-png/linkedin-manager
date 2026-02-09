import express from 'express'
import session from 'express-session'
import cors from 'cors'
import crypto from 'crypto'
import 'dotenv/config'

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
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
)

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
  req.session.oauthState = state

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

  if (!state || state !== req.session.oauthState) {
    return res.redirect(`${FRONTEND_URL}?linkedin_error=state_mismatch`)
  }

  try {
    // Exchange authorization code for access token
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

    // Fetch user profile using OpenID userinfo
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    )

    const profile = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error('Profile fetch failed:', profile)
      return res.redirect(`${FRONTEND_URL}?linkedin_error=profile_fetch_failed`)
    }

    // Store credentials in session
    req.session.linkedin = {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      profile: {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      },
    }

    delete req.session.oauthState
    res.redirect(`${FRONTEND_URL}?linkedin_connected=true`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.redirect(`${FRONTEND_URL}?linkedin_error=server_error`)
  }
})

// 3. Check authentication status
app.get('/api/auth/linkedin/status', (req, res) => {
  const linkedin = req.session.linkedin
  if (linkedin && linkedin.expiresAt > Date.now()) {
    res.json({ connected: true, profile: linkedin.profile })
  } else {
    if (linkedin) delete req.session.linkedin
    res.json({ connected: false })
  }
})

// 4. Disconnect LinkedIn
app.post('/api/auth/linkedin/disconnect', (req, res) => {
  delete req.session.linkedin
  res.json({ success: true })
})

// --- Auth middleware for protected routes ---

function requireLinkedInAuth(req, res, next) {
  const linkedin = req.session.linkedin
  if (!linkedin || linkedin.expiresAt <= Date.now()) {
    if (linkedin) delete req.session.linkedin
    return res.status(401).json({ error: 'Not authenticated with LinkedIn. Please connect first.' })
  }
  next()
}

// --- Publish Routes ---

// 5. Publish a post to LinkedIn
app.post('/api/linkedin/publish', requireLinkedInAuth, async (req, res) => {
  const { content, image } = req.body
  const { accessToken, profile } = req.session.linkedin
  const authorUrn = `urn:li:person:${profile.id}`

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Post content is required' })
  }

  try {
    let mediaAsset = null

    // Upload image if provided
    if (image) {
      mediaAsset = await uploadImage(accessToken, authorUrn, image)
    }

    // Build the UGC post payload
    const postPayload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
          ...(mediaAsset && {
            media: [
              {
                status: 'READY',
                media: mediaAsset,
              },
            ],
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
      throw new Error(
        errorData.message || `LinkedIn API error: ${publishResponse.status}`
      )
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
  // Step 1: Register the upload
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

  // Step 2: Upload the image binary
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
