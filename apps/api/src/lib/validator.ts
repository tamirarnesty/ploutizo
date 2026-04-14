// appValidator: wraps @hono/zod-validator's zValidator with the project error shape.
// Usage: appValidator('json', schema) or appValidator('query', schema)
// Access validated data in handlers: c.req.valid('json') — fully typed.
// Per D-02.

import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'
import type { ValidationTargets } from 'hono'

export const appValidator = <T extends ZodSchema>(
  target: keyof ValidationTargets,
  schema: T
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', errors: result.error.issues } },
        400
      )
    }
  })
