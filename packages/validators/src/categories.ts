import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  icon: z.string().optional(),
  colour: z.string().optional(),
  sortOrder: z.number().int().optional(),
})
export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// CategoryFormSchema — API schema minus sortOrder (not a form field)
export const CategoryFormSchema = createCategorySchema.omit({ sortOrder: true })
export type CategoryForm = z.infer<typeof CategoryFormSchema>
