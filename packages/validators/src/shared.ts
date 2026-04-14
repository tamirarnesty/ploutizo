import { z } from 'zod'

export const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()) })
