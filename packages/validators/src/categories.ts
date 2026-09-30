import { z } from 'zod';
import { colourTokenSchema } from './colour-tokens';
import { isoTimestampSchema } from './shared';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  icon: z.string().optional(),
  colour: colourTokenSchema,
  sortOrder: z.number().int().optional(),
});
export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// CategoryFormSchema — API schema minus sortOrder (not a form field)
export const CategoryFormSchema = createCategorySchema.omit({
  sortOrder: true,
});
export type CategoryForm = z.infer<typeof CategoryFormSchema>;

/** `GET /api/categories` row and the body of every category write. */
export const categorySchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  colour: colourTokenSchema,
  sortOrder: z.number().int(),
  archivedAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema,
});

export type Category = z.infer<typeof categorySchema>;
