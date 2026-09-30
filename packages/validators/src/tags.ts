import { z } from 'zod';
import { isoTimestampSchema } from './shared';

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required.'),
  colour: z.string().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

/** `GET /api/tags` row and the body of every tag write. */
export const tagSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  colour: z.string().nullable(),
  archivedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
});

export type Tag = z.infer<typeof tagSchema>;
