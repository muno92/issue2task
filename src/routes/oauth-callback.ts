import { Hono } from 'hono'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  issue2task: D1Database
}

const oauthCallback = new Hono<{ Bindings: Bindings }>()

// Google OAuth callback (as specified in Task.md)
oauthCallback.get('/', async (c) => {
  const code = c.req.query('code')
  const error = c.req.query('error')

  if (error) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .error {
              color: #d32f2f;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Authentication Error</h1>
            <p>Error: ${error}</p>
            <p><a href="/settings/auth/google">Try again</a></p>
          </div>
        </body>
      </html>
    `)
  }

  if (!code) {
    return c.text('No authorization code received', 400)
  }

  const clientId = c.env.GOOGLE_CLIENT_ID
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET
  const origin = new URL(c.req.url).origin.replace('http://', 'https://')
  const redirectUri = `${origin}/google-callback`

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return c.text('Failed to exchange authorization code', 500)
    }

    const tokens = await tokenResponse.json() as {
      access_token: string
      expires_in: number
      refresh_token?: string
      scope: string
      token_type: string
    }

    // Get user information
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info')
      return c.text('Failed to fetch user information', 500)
    }

    const userInfo = await userInfoResponse.json() as { email: string; id: string }

    // Save tokens to D1
    const expiresAt = Date.now() + tokens.expires_in * 1000
    const now = Date.now()

    await c.env.issue2task.prepare(`
      INSERT OR REPLACE INTO oauth_tokens (
        user_id,
        access_token,
        refresh_token,
        expires_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(
        userInfo.email,
        tokens.access_token,
        tokens.refresh_token || '',
        expiresAt,
        now,
        now
      )
      .run()

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .success {
              color: #388e3c;
              margin-bottom: 1rem;
            }
            .user-info {
              background: #f5f5f5;
              padding: 1rem;
              border-radius: 4px;
              margin: 1rem 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Authentication Successful</h1>
            <div class="user-info">
              <p><strong>Email:</strong> ${userInfo.email}</p>
            </div>
            <p>Redirecting to task list selection...</p>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/settings/tasklists/select?user_id=${encodeURIComponent(userInfo.email)}';
            }, 1500);
          </script>
        </body>
      </html>
    `)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.text('An error occurred during authentication', 500)
  }
})

export default oauthCallback