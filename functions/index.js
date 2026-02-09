import { onRequest } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import express from 'express'
import crypto from 'crypto'
import {
  getSession,
  setSessionCookie,
  clearSessionCookie,
  getOrigin,
} from './lib/session.js'

const linkedinClientId = defineString('LINKEDIN_CLIENT_ID')
const linkedinClientSecret = defineString('LINKEDIN_CLIENT_SECRET')
const linkedinRedirectUri = defineString('LINKEDIN_REDIRECT_URI', { default: '' })

const app = express()
app.use(express.json({ limit: '10mb' }))

// --- OAuth Routes ---

// 1. Initiate LinkedIn OAuth
app.get('/api/auth/linkedin', (req, res) => {
  const clientId = linkedinClientId.value()
  if (!clientId) {
    return res.status(500).json({ error: 'LINKEDIN_CLIENT_ID not configured' })
  }

  const origin = getOrigin(req)
  const redirectUri = linkedinRedirectUri.value() || `${origin}/api/auth/linkedin/callback`

  const state = crypto.randomUUID()
  setSessionCookie(res, { oauthState: state, expiresAt: Date.now() + 10 * 60 * 1000 })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email w_member_social',
  })

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
})

// 2. OAuth callback
app.get('/api/auth/linkedin/callback', async (req, res) => {
  const origin = getOrigin(req)
  const frontendUrl = origin
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${frontendUrl}?linkedin_error=${encodeURIComponent(error)}`)
  }

  const session = getSession(req)
  if (!session || !session.oauthState || session.oauthState !== state) {
    return res.redirect(`${frontendUrl}?linkedin_error=state_mismatch`)
  }

  const redirectUri = linkedinRedirectUri.value() || `${origin}/api/auth/linkedin/callback`

  try {
    const tokenResponse = await fetch(
      'https://www.linkedin.com/oauth/v2/accessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: linkedinClientId.value(),
          client_secret: linkedinClientSecret.value(),
          redirect_uri: redirectUri,
        }),
      }
    )

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return res.redirect(`${frontendUrl}?linkedin_error=token_exchange_failed`)
    }

    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )

    const profile = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error('Profile fetch failed:', profile)
      return res.redirect(`${frontendUrl}?linkedin_error=profile_fetch_failed`)
    }

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

    res.redirect(`${frontendUrl}?linkedin_connected=true`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.redirect(`${frontendUrl}?linkedin_error=server_error`)
  }
})

// 3. Check authentication status
app.get('/api/auth/linkedin/status', (req, res) => {
  const session = getSession(req)
  if (session && session.accessToken && session.expiresAt > Date.now()) {
    return res.json({ connected: true, profile: session.profile })
  }
  res.json({ connected: false })
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

// Export as Firebase Cloud Function
export const api = onRequest(app)
