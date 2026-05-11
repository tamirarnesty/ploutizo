import type { createTagSchema } from '@ploutizo/validators';
import { NotFoundError } from '../lib/errors';
import {
  archiveTag,
  insertTag,
  listTags as listTagsQuery,
} from '../lib/queries/tags';
import type { z } from 'zod';

export const listTags = async (orgId: string) => {
  return listTagsQuery(orgId);
};

export const createTag = async (
  orgId: string,
  data: z.infer<typeof createTagSchema>
) => {
  return insertTag(orgId, data);
};

export const archiveTagById = async (id: string, orgId: string) => {
  const updated = await archiveTag(id, orgId);
  if (!updated) throw new NotFoundError('Tag not found.');
  return updated;
};
