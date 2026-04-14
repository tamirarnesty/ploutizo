import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { z } from 'zod'
import { appValidator } from '../lib/validator'

const testSchema = z.object({ name: z.string().min(1) })

const buildApp = () => {
  const app = new Hono()
  app.post('/', appValidator('json', testSchema), (c) => {
    const data = c.req.valid('json')
    return c.json({ data })
  })
  return app
}

describe('appValidator()', () => {
  it('passes valid body to handler', async () => {
    const res = await buildApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'hello' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { name: string } }
    expect(body.data.name).toBe('hello')
  })

  it('returns 400 with VALIDATION_ERROR code on invalid body', async () => {
    const res = await buildApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string; errors: { message: string }[] } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.errors).toBeInstanceOf(Array)
    expect(body.error.errors.length).toBeGreaterThan(0)
    expect(body.error.errors[0]).toHaveProperty('message')
  })

  it('returns 400 when body is missing required field', async () => {
    const res = await buildApp().request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
