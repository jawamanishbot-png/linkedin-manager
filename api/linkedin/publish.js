import { getSession } from '../_lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

    // Upload image if provided
    if (image) {
      mediaAsset = await uploadImage(accessToken, authorUrn, image)
    }

    // Build UGC post payload
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
}

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
