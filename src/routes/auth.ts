import { Hono } from 'hono'

type Bindings = {
  GOOGLE_CLIENT_ID: string
}

const auth = new Hono<{ Bindings: Bindings }>()

// OAuth認証開始エンドポイント
auth.get('/google', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  const origin = new URL(c.req.url).origin.replace('http://', 'https://')
  const redirectUri = `${origin}/google-callback`

  const scope = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  return c.redirect(authUrl.toString())
})

export default auth
