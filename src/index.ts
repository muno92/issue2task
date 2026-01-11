import {Hono} from 'hono'
import {verifyGitHubSignature} from './middleware/verify-github-signature'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

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
