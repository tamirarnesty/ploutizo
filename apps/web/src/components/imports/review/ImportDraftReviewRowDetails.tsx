import { useEffect, useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import type { ImportDraftRow } from '@ploutizo/types';
import type { ImportMatchIssue } from '@ploutizo/utils';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import {
  formatExactImportMatchCopy,
  getImportRowLabel,
} from '../lib/importPresentation';
import { useImportDraftRowEvaluation } from './ImportDraftReviewContext';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';

const MATCH_ISSUE_COPY: Partial<Record<ImportMatchIssue, string>> = {
  collision:
    'Another row in this import uses the same external ID. Select one row and leave the other unselected.',
  invalidated_decision:
    'The saved match is no longer valid. Clear it or restore the original values to continue.',
  ambiguous_exact:
    'Multiple exact matches exist on this card. Review before continuing.',
};

interface ImportDraftReviewRowDetailsProps {
  row: ImportDraftRow;
}

export const ImportDraftReviewRowDetails = ({
  row,
}: ImportDraftReviewRowDetailsProps) => {
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const [notesDraft, setNotesDraft] = useState(() => row.reviewNotes ?? '');
  const rowLabel = getImportRowLabel(row);
  const tagsInputId = `import-row-tags-${row.id}`;
  const evaluation = useImportDraftRowEvaluation(row.id);
  const match = evaluation?.match;
  const exactCandidate = match?.exactCandidate;
  const exactExplanation = exactCandidate?.explanation;
  const advisory =
    exactCandidate || row.reviewMatchDismissed || row.reviewMatchedTransactionId
      ? undefined
      : match?.advisoryCandidates[0];
  const refundSuggestion = evaluation?.refundSuggestion;

  useEffect(() => {
    setNotesDraft(row.reviewNotes ?? '');
  }, [row.id, row.reviewNotes]);

  return (
    <div className="bg-muted/10 px-3 py-2">
      {(match?.issues ?? []).map((issue) => {
        const copy = MATCH_ISSUE_COPY[issue];
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
      {exactExplanation ? (
        <Text variant="body-sm" className="mb-2 text-muted-foreground">
          {formatExactImportMatchCopy(exactExplanation)}
        </Text>
      ) : null}
      {advisory ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Text variant="body-sm" className="text-muted-foreground">
            {advisory.explanation}
          </Text>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              saveField({
                reviewMatchedTransactionId: advisory.transactionId,
                reviewMatchDismissed: false,
              })
            }
          >
            Use this match
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={disabled}
            onClick={() =>
              saveField({
                reviewMatchedTransactionId: null,
                reviewMatchDismissed: true,
              })
            }
          >
            Not a match
          </Button>
        </div>
      ) : null}
      {refundSuggestion?.kind === 'existing' &&
      refundSuggestion.transactionId &&
      !row.reviewRefundOf ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Text variant="body-sm" className="text-muted-foreground">
            {refundSuggestion.explanation}
          </Text>
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              saveField({ reviewRefundOf: refundSuggestion.transactionId })
            }
          >
            Link refund
          </Button>
        </div>
      ) : null}
      <div className="grid min-w-[760px] grid-cols-[minmax(420px,2fr)_minmax(260px,1fr)] items-start gap-4">
        <div className="min-w-0">
          <Text
            as="label"
            htmlFor={`import-row-notes-${row.id}`}
            variant="body-sm"
            className="mb-1.5 block font-medium"
          >
            Notes
          </Text>
          <Textarea
            id={`import-row-notes-${row.id}`}
            aria-label={`Notes for ${rowLabel}`}
            value={notesDraft}
            disabled={disabled}
            rows={1}
            className="h-10 min-h-10 w-full resize-y"
            autoComplete="off"
            placeholder="Add a note…"
            onChange={(event) => {
              const raw = event.currentTarget.value;
              setNotesDraft(raw);
              const next = raw.trim() || null;
              if (next === row.reviewNotes) return;
              saveField({ reviewNotes: next });
            }}
          />
        </div>
        <div className="min-w-0">
          <Text
            as="label"
            htmlFor={tagsInputId}
            variant="body-sm"
            className="mb-1.5 block font-medium"
          >
            Tags
          </Text>
          <TransactionTagPicker
            value={row.reviewTagIds}
            allowCreate={false}
            disabled={disabled}
            inputId={tagsInputId}
            inputAriaLabel={`Tags for ${rowLabel}`}
            onChange={(nextTagIds) => {
              if (nextTagIds.join('|') === row.reviewTagIds.join('|')) {
                return;
              }
              saveField({ reviewTagIds: nextTagIds });
            }}
          />
        </div>
      </div>
    </div>
  );
};
