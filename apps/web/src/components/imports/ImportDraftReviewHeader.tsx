import { Button } from '@ploutizo/ui/components/button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import type { ImportDraft } from '@ploutizo/types';
import {
  formatDraftAccountLabel,
  formatImportDraftReviewSubtitle,
} from './importPresentation';

const IMPORT_COMMIT_PREVIEW_COPY = 'Import commit coming soon';

interface ImportDraftReviewHeaderProps {
  draft?: ImportDraft;
  isLoading?: boolean;
  canContinue: boolean;
  continueBlocker: string | null;
}

export const ImportDraftReviewHeader = ({
  draft,
  isLoading = false,
  canContinue: _canContinue,
  continueBlocker,
}: ImportDraftReviewHeaderProps) => {
  const continueButton = (
    <Button disabled type="button">
      Continue
    </Button>
  );

  const tooltipContent = continueBlocker
    ? `${continueBlocker} ${IMPORT_COMMIT_PREVIEW_COPY}.`
    : IMPORT_COMMIT_PREVIEW_COPY;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {draft ? (
          <>
            <Text as="h2" variant="h3" className="truncate">
              {formatDraftAccountLabel(draft)}
            </Text>
            <Text variant="body-sm" className="truncate text-muted-foreground">
              {formatImportDraftReviewSubtitle(draft)}
            </Text>
          </>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        {draft ? (
          <Tooltip>
            <TooltipTrigger render={continueButton} />
            <TooltipContent>{tooltipContent}</TooltipContent>
          </Tooltip>
        ) : isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          continueButton
        )}
        {draft ? (
          <Text
            variant="body-sm"
            className="max-w-sm text-right text-muted-foreground"
          >
            {IMPORT_COMMIT_PREVIEW_COPY}
          </Text>
        ) : null}
      </div>
    </div>
  );
};
