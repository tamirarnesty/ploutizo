import { db } from '@ploutizo/db';
import type {
  createCategorySchema,
  updateCategorySchema,
} from '@ploutizo/validators';
import { NotFoundError } from '../lib/errors';
import {
  archiveCategory,
  insertCategory,
  listCategories as listCategoriesQuery,
  reorderCategories as reorderCategoriesQuery,
  restoreCategory,
  updateCategory as updateCategoryQuery,
} from '../lib/queries/categories';
import type { z } from 'zod';

export const reorderCategories = async (
  orgId: string,
  orderedIds: string[]
) => {
  await db.transaction(async (tx) => {
    await reorderCategoriesQuery(tx, orgId, orderedIds);
  });
};

export const listCategories = async (
  orgId: string,
  options?: { includeArchived?: boolean }
) => {
  return listCategoriesQuery(orgId, options);
};

export const createCategory = async (
  orgId: string,
  data: z.infer<typeof createCategorySchema>
) => {
  return insertCategory(orgId, data);
};

export const updateCategory = async (
  id: string,
  orgId: string,
  data: z.infer<typeof updateCategorySchema>
) => {
  const updated = await updateCategoryQuery(id, orgId, data);
  if (!updated) throw new NotFoundError('Category not found.');
  return updated;
};

export const archiveCategoryById = async (id: string, orgId: string) => {
  const updated = await archiveCategory(id, orgId);
  if (!updated) throw new NotFoundError('Category not found.');
  return updated;
};

export const restoreCategoryById = async (id: string, orgId: string) => {
  const updated = await restoreCategory(id, orgId);
  if (!updated) {
    throw new NotFoundError('Category not found or already active.');
  }
  return updated;
};
