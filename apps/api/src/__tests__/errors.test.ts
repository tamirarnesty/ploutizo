import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import { DomainError, NotFoundError } from '../lib/errors'

describe('DomainError', () => {
  it('stores statusCode and message', () => {
    const err = new DomainError(422, 'unprocessable')
    expect(err.statusCode).toBe(422)
    expect(err.message).toBe('unprocessable')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('NotFoundError', () => {
  it('has statusCode 404 and is a DomainError', () => {
    const err = new NotFoundError('thing not found')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('thing not found')
    expect(err).toBeInstanceOf(DomainError)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('app.onError() handler', () => {
  const buildApp = (thrower: () => never) => {
    const app = new Hono()
    app.get('/', () => { thrower() })
    app.onError((err, c) => {
      if (err instanceof NotFoundError) {
        return c.json({ error: { code: 'NOT_FOUND', message: err.message } }, 404)
      }
      if (err instanceof DomainError) {
        return c.json({ error: { code: 'DOMAIN_ERROR', message: err.message } }, err.statusCode as StatusCode)
      }
      return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }, 500)
    })
    return app
  }

  it('maps NotFoundError to 404 NOT_FOUND', async () => {
    const app = buildApp(() => { throw new NotFoundError('thing not found') })
    const res = await app.request('/')
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('thing not found')
  })

  it('maps DomainError to its statusCode', async () => {
    const app = buildApp(() => { throw new DomainError(422, 'invalid state') })
    const res = await app.request('/')
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('DOMAIN_ERROR')
    expect(body.error.message).toBe('invalid state')
  })

  it('maps generic Error to 500 INTERNAL_ERROR', async () => {
    const app = buildApp(() => { throw new Error('boom') })
    const res = await app.request('/')
    expect(res.status).toBe(500)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('Unexpected error')
  })
})
