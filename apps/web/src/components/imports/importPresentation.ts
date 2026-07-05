import { formatAccountLabel } from '@ploutizo/utils';
import type {
  ImportBatchStatus,
  ImportDraft,
  ImportDraftSummary,
} from '@ploutizo/types';

export const formatDraftAccountLabel = (
  draft: ImportDraftSummary | ImportDraft
): string =>
  formatAccountLabel({
    name: draft.accountName,
    institution: draft.accountInstitution,
    lastFour: draft.accountLastFour,
  });

const IMPORT_BATCH_STATUS_LABELS: Record<ImportBatchStatus, string> = {
  draft: 'Draft',
  completed: 'Completed',
  discarded: 'Discarded',
};

export const formatImportBatchStatusLabel = (
  status: ImportBatchStatus
): string => IMPORT_BATCH_STATUS_LABELS[status];

export const importBatchStatusVariant = (
  status: ImportBatchStatus
): 'destructive' | 'secondary' | 'default' | 'outline' | undefined => {
  if (status === 'completed') return 'outline';
  if (status === 'discarded') return 'secondary';
  return 'secondary';
};
