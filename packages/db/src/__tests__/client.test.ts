import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock postgres.js and drizzle-orm before importing client
vi.mock('postgres', () => ({
  default: vi.fn(() => ({ end: vi.fn() })),
}))
vi.mock('drizzle-orm/postgres-js', () => ({
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

  it('initializes postgres.js with DATABASE_URL', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postgres = (await import('postgres')).default as unknown as ReturnType<typeof vi.fn>
    await import('../client.js')
    expect(postgres).toHaveBeenCalledWith(
      'postgresql://test:test@localhost/test',
      expect.objectContaining({ max: 10 })
    )
  })
})
