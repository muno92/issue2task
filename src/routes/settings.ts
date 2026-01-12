import { Hono } from 'hono'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  issue2task: D1Database
}

const settings = new Hono<{ Bindings: Bindings }>()

// Settings index page with authenticated users list
settings.get('/', async (c) => {
  // Get all authenticated users from database
  const users = await c.env.issue2task
    .prepare('SELECT user_id, created_at FROM oauth_tokens ORDER BY created_at DESC')
    .all()

  const authenticatedUsers = users.results as Array<{ user_id: string; created_at: number }>

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Settings - GitHub Issues to Google Tasks</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          h1 {
            color: #333;
            margin-bottom: 1rem;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-block;
            background: #4285f4;
            color: white;
            padding: 12px 32px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.3s;
          }
          .btn:hover {
            background: #357ae8;
          }
          .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          .user-list {
            margin-bottom: 2rem;
            text-align: left;
          }
          .user-item {
            padding: 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .user-item:hover {
            border-color: #4285f4;
            background: #f8f9fa;
          }
          .user-id {
            font-weight: 500;
            color: #333;
          }
          .separator {
            margin: 2rem 0;
            border-top: 1px solid #e0e0e0;
            position: relative;
          }
          .separator-text {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 1rem;
            color: #999;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">⚙️</div>
          <h1>Settings</h1>
          ${authenticatedUsers.length > 0 ? `
            <p>Select an authenticated account to manage settings</p>
            <div class="user-list">
              ${authenticatedUsers.map(user => `
                <div class="user-item" onclick="window.location.href='/settings/tasklists/select?user_id=${encodeURIComponent(user.user_id)}'">
                  <span class="user-id">${user.user_id}</span>
                  <span>→</span>
                </div>
              `).join('')}
            </div>
            <div class="separator">
              <span class="separator-text">or</span>
            </div>
            <a href="/settings/auth/google" class="btn">Add New Account</a>
          ` : `
            <p>Connect your Google account to sync GitHub issues with Google Tasks</p>
            <a href="/settings/auth/google" class="btn">Connect with Google</a>
          `}
        </div>
      </body>
    </html>
  `)
})

export default settings
