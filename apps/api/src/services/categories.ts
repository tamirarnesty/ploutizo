import { db } from '@ploutizo/db'
import { NotFoundError } from '../lib/errors'
import {
  archiveCategory,
  insertCategory,
  listCategories as listCategoriesQuery,
  reorderCategories as reorderCategoriesQuery,
  updateCategory as updateCategoryQuery,
} from '../lib/queries/categories'
import type { createCategorySchema, updateCategorySchema } from '@ploutizo/validators'
import type { z } from 'zod'

export async function reorderCategories(
  orgId: string,
  orderedIds: string[]
) {
  await db.transaction(async (tx) => {
    await reorderCategoriesQuery(tx, orgId, orderedIds)
  })
}

export async function listCategories(orgId: string) {
  return listCategoriesQuery(orgId)
}

export async function createCategory(
  orgId: string,
  data: z.infer<typeof createCategorySchema>
) {
  return insertCategory(orgId, data)
}

export async function updateCategory(
  id: string,
  orgId: string,
  data: z.infer<typeof updateCategorySchema>
) {
  const updated = await updateCategoryQuery(id, orgId, data)
  if (!updated) throw new NotFoundError('Category not found.')
  return updated
}

export async function archiveCategoryById(id: string, orgId: string) {
  const updated = await archiveCategory(id, orgId)
  if (!updated) throw new NotFoundError('Category not found.')
  return updated
}
