import { AlertCircle, CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ImportDraftRow } from '@ploutizo/types';
import { useImportDraftReviewFailedRowIds } from './ImportDraftReviewContext';
import { getImportRowStatusTooltip } from './importPresentation';

const statusIconClassName: Record<ImportDraftRow['status'], string> = {
  ready: 'text-emerald-600 dark:text-emerald-400',
  needs_review: 'text-amber-600 dark:text-amber-400',
  invalid: 'text-destructive',
  skipped: 'text-muted-foreground',
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
    return <AlertCircle className={className} aria-hidden="true" />;
  }

  switch (status) {
    case 'ready':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'needs_review':
      return <AlertCircle className={className} aria-hidden="true" />;
    case 'invalid':
      return <XCircle className={className} aria-hidden="true" />;
    case 'skipped':
      return <CircleSlash className={className} aria-hidden="true" />;
    default:
      return <AlertCircle className={className} aria-hidden="true" />;
  }
};

interface ImportRowStatusIconProps {
  row: ImportDraftRow;
}

export const ImportRowStatusIcon = ({ row }: ImportRowStatusIconProps) => {
  const failedRowIds = useImportDraftReviewFailedRowIds();
  const persistFailed = failedRowIds.includes(row.id);
  const tooltip = persistFailed
    ? 'Could not save this row. Use Retry in the draft autosave strip.'
    : getImportRowStatusTooltip(row);

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
};
