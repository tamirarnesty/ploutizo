import { Hono } from 'hono'
import { getSettlementBalances } from '../services/settlements'
import type { AppEnv } from '../types'

const settlementsRouter = new Hono<AppEnv>()

// GET / — settlement balances per account, per member (D-02)
settlementsRouter.get('/', async (c) => {
  const orgId = c.get('orgId')
  const result = await getSettlementBalances(orgId)
  return c.json(result)
})

export { settlementsRouter }
