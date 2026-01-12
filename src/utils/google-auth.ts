type TokenData = {
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: number
}

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  issue2task: D1Database
}

/**
 * Get valid access token for user, refreshing if necessary
 */
export async function getValidAccessToken(
  userId: string,
  env: Bindings
): Promise<string | null> {
  // Get token data from database
  const result = await env.issue2task
    .prepare('SELECT user_id, access_token, refresh_token, expires_at FROM oauth_tokens WHERE user_id = ?')
    .bind(userId)
    .first<TokenData>()

  if (!result) {
    return null
  }

  const now = Date.now()
  const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

  // If token is still valid, return it
  if (result.expires_at > now + bufferTime) {
    return result.access_token
  }

  // Token expired or about to expire, refresh it
  if (!result.refresh_token) {
    console.error('No refresh token available for user:', userId)
    return null
  }

  try {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: result.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      console.error('Token refresh failed:', errorText)
      return null
    }

    const tokens = await refreshResponse.json() as {
      access_token: string
      expires_in: number
      scope: string
      token_type: string
    }

    // Update token in database
    const newExpiresAt = now + tokens.expires_in * 1000
    await env.issue2task
      .prepare(`
        UPDATE oauth_tokens
        SET access_token = ?, expires_at = ?, updated_at = ?
        WHERE user_id = ?
      `)
      .bind(tokens.access_token, newExpiresAt, now, userId)
      .run()

    return tokens.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}