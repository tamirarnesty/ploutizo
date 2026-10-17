import { memo } from 'react';
import { AlertCircle, CheckCircle2, CloudAlert, XCircle } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ImportDraftRow } from '@ploutizo/types';
import { useImportReviewAutosaveRowFailed } from '@/lib/data-access/imports/useImportReviewAutosave';
import { getImportRowStatusTooltip } from '../lib/importPresentation';
import {
  useImportDraftReviewContext,
  useImportDraftRowEvaluation,
} from './ImportDraftReviewContext';
import { useImportReviewRowScope } from './ImportReviewRowScope';

const statusIconClassName: Record<ImportDraftRow['status'], string> = {
  ready: 'text-success-foreground',
  needs_review: 'text-warning-foreground',
  invalid: 'text-destructive',
};

const StatusIcon = ({
  status,
  persistFailed,
}: {
  status: ImportDraftRow['status'];
  persistFailed: boolean;
}) => {
  const className = cn(
    'size-4 shrink-0',
    persistFailed ? 'text-destructive' : statusIconClassName[status]
  );

  if (persistFailed) {
    return <CloudAlert className={className} aria-hidden="true" />;
  }

  switch (status) {
    case 'ready':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'needs_review':
      return <AlertCircle className={className} aria-hidden="true" />;
    case 'invalid':
      return <XCircle className={className} aria-hidden="true" />;
    default:
      return <AlertCircle className={className} aria-hidden="true" />;
  }
};

export const ImportRowStatusIcon = memo(() => {
  const { draftId } = useImportDraftReviewContext();
  const { rowId, row } = useImportReviewRowScope();
  const persistFailed = useImportReviewAutosaveRowFailed(draftId, rowId);
  const evaluation = useImportDraftRowEvaluation(rowId);
  const tooltip = persistFailed
    ? 'Could not save this row. Select Retry in the save error notification.'
    : getImportRowStatusTooltip(row, evaluation?.blockers, evaluation?.match);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={tooltip}
          />
        }
      >
        <StatusIcon status={row.status} persistFailed={persistFailed} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
});

ImportRowStatusIcon.displayName = 'ImportRowStatusIcon';
