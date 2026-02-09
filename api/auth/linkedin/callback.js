import { getSession, setSessionCookie, getOrigin } from '../../_lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const origin = getOrigin(req)
  const frontendUrl = process.env.FRONTEND_URL || origin
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${frontendUrl}?linkedin_error=${encodeURIComponent(error)}`)
  }

  // Verify OAuth state
  const session = getSession(req)
  if (!session || !session.oauthState || session.oauthState !== state) {
    return res.redirect(`${frontendUrl}?linkedin_error=state_mismatch`)
  }

  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    `${origin}/api/auth/linkedin/callback`

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
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
          redirect_uri: redirectUri,
        }),
      }
    )

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return res.redirect(`${frontendUrl}?linkedin_error=token_exchange_failed`)
    }

    // Fetch user profile
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )

    const profile = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error('Profile fetch failed:', profile)
      return res.redirect(`${frontendUrl}?linkedin_error=profile_fetch_failed`)
    }

    // Store session in encrypted cookie
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
}
