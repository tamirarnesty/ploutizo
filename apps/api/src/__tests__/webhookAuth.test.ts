import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { webhookAuth } from '../middleware/webhookAuth'

// Mock svix Webhook class
const mockVerify = vi.fn()
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({ verify: mockVerify })),
}))

// Mock @clerk/backend WebhookEvent type (no runtime mock needed — it's a type-only import)

const buildApp = () => {
  const app = new Hono()
  app.post('/webhooks/clerk', webhookAuth(), (c) => {
    const event = c.get('webhookEvent')
    return c.json({ data: { type: (event as { type: string }).type } })
  })
  return app
}

const validHeaders = {
  'content-type': 'application/json',
  'svix-id': 'msg_123',
  'svix-timestamp': '1234567890',
  'svix-signature': 'v1,valid_sig',
}

describe('webhookAuth()', () => {
  beforeEach(() => { mockVerify.mockReset() })

  it('returns 500 when CLERK_WEBHOOK_SECRET is not set', async () => {
    const original = process.env.CLERK_WEBHOOK_SECRET
    delete process.env.CLERK_WEBHOOK_SECRET
    const res = await buildApp().request('/webhooks/clerk', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ type: 'organization.created' }),
    })
    expect(res.status).toBe(500)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('CONFIG_ERROR')
    process.env.CLERK_WEBHOOK_SECRET = original
  })

  it('returns 400 when Svix signature verification fails', async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    mockVerify.mockImplementation(() => { throw new Error('invalid signature') })
    const res = await buildApp().request('/webhooks/clerk', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({ type: 'organization.created' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_SIGNATURE')
  })

  it('calls next() and exposes webhookEvent on context when signature is valid', async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'
    const fakeEvent = { type: 'organization.created', data: { id: 'org_1' } }
    mockVerify.mockReturnValue(fakeEvent)
    const res = await buildApp().request('/webhooks/clerk', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify(fakeEvent),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { type: string } }
    expect(body.data.type).toBe('organization.created')
  })
})
