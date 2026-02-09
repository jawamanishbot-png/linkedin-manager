import crypto from 'crypto'
import { setSessionCookie, getOrigin } from '../../_lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) {
    return res.status(500).json({ error: 'LINKEDIN_CLIENT_ID not configured' })
  }

  const origin = getOrigin(req)
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    `${origin}/api/auth/linkedin/callback`

  const state = crypto.randomUUID()

  // Store OAuth state in a short-lived cookie
  setSessionCookie(res, { oauthState: state, expiresAt: Date.now() + 10 * 60 * 1000 })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email w_member_social r_member_social',
  })

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
