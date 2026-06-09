import { formatAccountLabel } from '@ploutizo/utils';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
} from '@ploutizo/types';

export { formatAccountLabel };

export const formatDraftAccountLabel = (
  draft: ImportDraftSummary | ImportDraft
): string =>
  formatAccountLabel({
    name: draft.accountName,
    institution: draft.accountInstitution,
    lastFour: draft.accountLastFour,
  });

export const importStatusVariant = (status: ImportDraftRow['status']) => {
  if (status === 'invalid') return 'destructive' as const;
  if (status === 'ready') return 'outline' as const;
  return 'secondary' as const;
};
