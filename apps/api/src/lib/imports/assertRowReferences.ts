import { NotFoundError } from '@/lib/errors';
import {
  allMembersInOrg,
  allTagsInOrg,
  categoryExistsInOrg,
} from '@/lib/queries/scope';

export interface ImportRowWriteReferences {
  reviewCategoryId?: string | null;
  reviewTagIds?: string[];
  reviewAssigneeMemberIds?: string[];
}

export const assertImportRowWriteReferences = async (
  orgId: string,
  refs: ImportRowWriteReferences
): Promise<void> => {
  if (refs.reviewCategoryId) {
    if (!(await categoryExistsInOrg(orgId, refs.reviewCategoryId))) {
      throw new NotFoundError('Category not found');
    }
  }

  if (refs.reviewTagIds && refs.reviewTagIds.length > 0) {
    if (!(await allTagsInOrg(orgId, refs.reviewTagIds))) {
      throw new NotFoundError('Tag not found');
    }
  }

  if (refs.reviewAssigneeMemberIds && refs.reviewAssigneeMemberIds.length > 0) {
    if (!(await allMembersInOrg(orgId, refs.reviewAssigneeMemberIds))) {
      throw new NotFoundError('Member not found in this household');
    }
  }
};
