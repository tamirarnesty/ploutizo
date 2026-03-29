import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { tenantGuard } from '../middleware/tenantGuard.js'

// Mock @hono/clerk-auth to control what getAuth() returns per test
vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(),
  clerkMiddleware: vi.fn(() => async (_c: unknown, next: () => Promise<void>) => next()),
}))

import { getAuth } from '@hono/clerk-auth'

const buildApp = () => {
  const app = new Hono()
  app.use('*', tenantGuard())
  app.get('/', (c) => c.json({ data: { ok: true } }))
  return app
}

describe('tenantGuard()', () => {
  it('returns 401 when orgId is undefined', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: undefined } as ReturnType<typeof getAuth>)
    const res = await buildApp().request('/')
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('TENANT_REQUIRED')
  })

  it('returns 401 when orgId is null', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: null } as unknown as ReturnType<typeof getAuth>)
    const res = await buildApp().request('/')
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('TENANT_REQUIRED')
  })

  it('returns 401 when orgId is empty string', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: '' } as unknown as ReturnType<typeof getAuth>)
    const res = await buildApp().request('/')
    expect(res.status).toBe(401)
  })

  it('calls next() and returns 200 when orgId is a valid string', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: 'org_abc123' } as ReturnType<typeof getAuth>)
    const res = await buildApp().request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { ok: boolean } }
    expect(body.data.ok).toBe(true)
  })

  it('error body has correct shape', async () => {
    vi.mocked(getAuth).mockReturnValue({ orgId: undefined } as ReturnType<typeof getAuth>)
    const res = await buildApp().request('/')
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error.code')
    expect(body).toHaveProperty('error.message')
    expect(body).not.toHaveProperty('data')
  })
})
