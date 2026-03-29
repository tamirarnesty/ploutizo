import { Hono } from 'hono'

const healthRouter = new Hono()

healthRouter.get('/', (c) => c.json({ data: { status: 'ok' } }))

export { healthRouter }
