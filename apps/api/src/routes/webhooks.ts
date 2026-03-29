import { Hono } from 'hono'

const webhooksRouter = new Hono()

// Clerk org.created webhook handler — implemented in Plan 05
webhooksRouter.post('/clerk', (c) => c.json({ data: { received: true } }))

export { webhooksRouter }
