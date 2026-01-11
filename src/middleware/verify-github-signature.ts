import type { MiddlewareHandler } from 'hono'
import { Webhooks } from '@octokit/webhooks'

type Bindings = {
  WEBHOOK_SECRET: string
}

// GitHub webhook signature verification middleware
export const verifyGitHubSignature: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
    const secret = c.env.WEBHOOK_SECRET;
    if (!secret) {
        return c.json({ error: 'Server configuration error' }, 500)
    }

    const signature = c.req.header('X-Hub-Signature-256')
    if (!signature) {
        return c.json({ error: 'Missing signature' }, 401)
    }

    const payload = await c.req.text()
    try {
        const isValid = await new Webhooks({ secret }).verify(payload, signature)
        if (!isValid) {
            return c.json({ error: 'Invalid signature' }, 401)
        }
    } catch (error) {
        return c.json({ error: 'Signature verification failed' }, 401)
    }

    await next()
}
