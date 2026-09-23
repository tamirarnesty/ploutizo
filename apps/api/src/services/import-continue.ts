import { db } from '@ploutizo/db';
import type {
  ImportFinalizePreview,
  ImportRequirementFailureDetails,
} from '@ploutizo/types';
import type { ImportSetRequest } from '@/services/import-set';
import { DomainError } from '@/lib/errors';
import { lockImportDraftBatch } from '@/lib/queries/imports';
import { verifyImportSetForDraft } from '@/services/import-set';
import { toImportFinalizePreview } from '@/services/import-preview';

export const continueImportDraft = async (
  request: ImportSetRequest
): Promise<ImportFinalizePreview> =>
  db.transaction(async (tx) => {
    await lockImportDraftBatch(tx, request.orgId, request.batchId);

    const verified = await verifyImportSetForDraft(tx, request);
    if (!verified.ready) {
      throw new DomainError<ImportRequirementFailureDetails>(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_CONTINUE_NOT_READY',
        { rows: verified.failures }
      );
    }

    return toImportFinalizePreview(
      request.batchId,
      verified.draft.rowCount,
      verified.projection
    );
  });
