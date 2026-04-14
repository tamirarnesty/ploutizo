import { NotFoundError } from '../lib/errors'
import {
  archiveTag,
  insertTag,
  listTags as listTagsQuery,
} from '../lib/queries/tags'
import type { createTagSchema } from '@ploutizo/validators'
import type { z } from 'zod'

export async function listTags(orgId: string) {
  return listTagsQuery(orgId)
}

export async function createTag(
  orgId: string,
  data: z.infer<typeof createTagSchema>
) {
  return insertTag(orgId, data)
}

export async function archiveTagById(id: string, orgId: string) {
  const updated = await archiveTag(id, orgId)
  if (!updated) throw new NotFoundError('Tag not found.')
  return updated
}
