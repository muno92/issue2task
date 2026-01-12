import {Hono} from 'hono'
import {verifyGitHubSignature} from './middleware/verify-github-signature'
import auth from './routes/auth'
import tasklists from './routes/tasklists'
import settings from './routes/settings'
import oauthCallback from './routes/oauth-callback'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_API_KEY: string
  issue2task: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub Issues to Google Tasks</title>
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">📋 → ✅</div>
          <h1>GitHub Issues to Google Tasks</h1>
          <p>Automatically sync your GitHub issues with Google Tasks</p>
          <a href="/settings" class="btn">Go to Settings</a>
        </div>
      </body>
    </html>
  `)
})

app.route('/settings', settings)
app.route('/settings/auth', auth)
app.route('/settings/tasklists', tasklists)
app.route('/google-callback', oauthCallback)

app.post('/webhook/gh-issue-to-calendar-task', verifyGitHubSignature, async (c) => {
  const eventName = c.req.header('X-GitHub-Event')
  if (eventName !== 'projects_v2_item') {
    return c.text('Invalid event type', 400)
  }

  const payload = await c.req.json();
  if (payload.action !== 'edited') {
    // Only "edited" actions are processed. For other action types, we return 200 as expected by GitHub to avoid delivery errors.
    return c.text('Event action is not "edited"', 200)
  }

  return c.text('Webhook received successfully')
})

export default app
