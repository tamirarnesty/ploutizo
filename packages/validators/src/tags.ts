import { z } from 'zod'

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required.'),
  colour: z.string().optional(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>
