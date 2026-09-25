import { memo } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  IMPORT_MATCH_ISSUE_COPY,
  deriveImportMatchReviewUiState,
} from '@ploutizo/utils';
import type { ImportMatchReviewAction } from '@ploutizo/utils';
import { formatExactImportMatchCopy } from '../lib/importPresentation';
import { useImportDraftRowEvaluation } from './ImportDraftReviewContext';
import { useImportReviewRowScope } from './ImportReviewRowScope';

interface ImportMatchReviewPanelProps {
  disabled: boolean;
  onAcceptAdvisory: (transactionId: string) => void;
  onDismissMatch: () => void;
}

const ACTION_LABELS: Record<ImportMatchReviewAction, string> = {
  accept_advisory: 'Use this match',
  dismiss_match: 'Not a match',
  clear_invalid_match: 'Clear match',
};

export const ImportMatchReviewPanel = memo(
  ({
    disabled,
    onAcceptAdvisory,
    onDismissMatch,
  }: ImportMatchReviewPanelProps) => {
    const { rowId, row } = useImportReviewRowScope();
    const evaluation = useImportDraftRowEvaluation(rowId);
    const ui = deriveImportMatchReviewUiState(row, evaluation?.match);

    const handleAction = (action: ImportMatchReviewAction) => {
      if (action === 'accept_advisory' && ui.advisory) {
        onAcceptAdvisory(ui.advisory.transactionId);
        return;
      }
      onDismissMatch();
    };

    return (
      <>
        {ui.issues.map((issue) => {
          const copy = IMPORT_MATCH_ISSUE_COPY[issue];
          if (!copy) return null;
          return (
            <Text
              key={issue}
              variant="body-sm"
              className="mb-2 text-amber-700 dark:text-amber-400"
            >
              {copy}
            </Text>
          );
        })}
        {ui.exactExplanation ? (
          <Text variant="body-sm" className="mb-2 text-muted-foreground">
            {formatExactImportMatchCopy(ui.exactExplanation)}
          </Text>
        ) : null}
        {ui.advisory || ui.actions.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {ui.advisory ? (
              <Text variant="body-sm" className="text-muted-foreground">
                {ui.advisory.explanation}
              </Text>
            ) : null}
            {ui.actions.map((action) => (
              <Button
                key={action}
                type="button"
                size="xs"
                variant={action === 'dismiss_match' ? 'ghost' : 'outline'}
                disabled={disabled}
                onClick={() => handleAction(action)}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        ) : null}
      </>
    );
  }
);

ImportMatchReviewPanel.displayName = 'ImportMatchReviewPanel';
