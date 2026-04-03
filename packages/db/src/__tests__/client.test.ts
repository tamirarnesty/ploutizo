import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @neondatabase/serverless and drizzle-orm/neon-serverless before importing client
vi.mock('@neondatabase/serverless', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Pool: vi.fn(function (this: any) { return this }),
  neonConfig: {},  // plain writable object — must NOT be frozen (Pitfall 2)
}))
vi.mock('drizzle-orm/neon-serverless', () => ({
  drizzle: vi.fn(() => ({ _: 'drizzle-instance' })),
}))

describe('db client', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'
  })

  it('exports a db object', async () => {
    const { db } = await import('../client.js')
    expect(db).toBeDefined()
  })

  it('initializes Pool with DATABASE_URL', async () => {
    const { Pool } = (await import('@neondatabase/serverless')) as unknown as {
      Pool: ReturnType<typeof vi.fn>
    }
    await import('../client.js')
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: 'postgresql://test:test@localhost/test' })
    )
  })
})
