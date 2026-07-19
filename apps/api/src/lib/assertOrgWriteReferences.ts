import type { DrizzleTransaction } from '@/lib/queries/scope';
import { NotFoundError } from '@/lib/errors';
import {
  allMembersInOrg,
  allTagsInOrg,
  categoryExistsInOrg,
} from '@/lib/queries/scope';

export interface OrgWriteReferences {
  categoryId?: string | null;
  tagIds?: string[];
  memberIds?: string[];
}

export const assertOrgWriteReferences = async (
  orgId: string,
  refs: OrgWriteReferences,
  tx?: DrizzleTransaction
): Promise<void> => {
  await Promise.all([
    refs.categoryId
      ? categoryExistsInOrg(orgId, refs.categoryId, tx).then((ok) => {
          if (!ok) throw new NotFoundError('Category not found');
        })
      : Promise.resolve(),
    refs.tagIds && refs.tagIds.length > 0
      ? allTagsInOrg(orgId, refs.tagIds, tx).then((ok) => {
          if (!ok) throw new NotFoundError('Tag not found');
        })
      : Promise.resolve(),
    refs.memberIds && refs.memberIds.length > 0
      ? allMembersInOrg(orgId, refs.memberIds, tx).then((ok) => {
          if (!ok) throw new NotFoundError('Member not found in this household');
        })
      : Promise.resolve(),
  ]);
};
