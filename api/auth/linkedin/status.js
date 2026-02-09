import { getSession } from '../../_lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = getSession(req)

  if (session && session.accessToken && session.expiresAt > Date.now()) {
    return res.json({ connected: true, profile: session.profile })
  }

  res.json({ connected: false })
}
