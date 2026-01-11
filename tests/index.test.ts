import { describe, it, expect } from 'vitest'
import { Webhooks } from '@octokit/webhooks'
import app from '../src/index'

describe('GitHub Webhook', () => {
  const secret = 'dummy-secret'
  const env = {
    WEBHOOK_SECRET: secret
  }

  it('should respond with 401 for missing signature', async () => {
    const response = await app.request('/webhook/gh-issue-to-calendar-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: {} })
    }, env)

    expect(response.status).toBe(401)
  })

  it('should respond with 401 for invalid signature', async () => {
    const response = await app.request('/webhook/gh-issue-to-calendar-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=invalid_signature_here'
      },
      body: JSON.stringify({ changes: {} })
    }, env)

    expect(response.status).toBe(401)
  })

  it('should respond with 200 for valid signature', async () => {
    const payload = JSON.stringify({ action: 'opened', issue: { id: 123 } })
    const webhooks = new Webhooks({ secret })
    const signature = await webhooks.sign(payload)

    const response = await app.request('/webhook/gh-issue-to-calendar-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
        'X-GitHub-Event': 'issues'
      },
      body: payload
    }, env)

    expect(response.status).toBe(200)
  })
})
