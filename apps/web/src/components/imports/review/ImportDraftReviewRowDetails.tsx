import { useEffect, useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import type { ImportDraftRow } from '@ploutizo/types';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import { evaluateImportDraftWorkingCopy } from '@/lib/data-access/imports/rederiveImportDraftWorkingCopy';
import { getImportRowLabel } from '../lib/importPresentation';
import { useImportDraftReviewContext } from './ImportDraftReviewContext';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';

interface ImportDraftReviewRowDetailsProps {
  row: ImportDraftRow;
}

export const ImportDraftReviewRowDetails = ({
  row,
}: ImportDraftReviewRowDetailsProps) => {
  const { draftId } = useImportDraftReviewContext();
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const [notesDraft, setNotesDraft] = useState(() => row.reviewNotes ?? '');
  const rowLabel = getImportRowLabel(row);
  const tagsInputId = `import-row-tags-${row.id}`;
  const evaluation = evaluateImportDraftWorkingCopy(draftId)?.get(row.id);
  const match = evaluation?.match;
  const exactExplanation = match?.exactCandidate?.explanation;
  const advisory = match?.advisoryCandidates[0];
  const refundSuggestion = evaluation?.refundSuggestion;

  useEffect(() => {
    setNotesDraft(row.reviewNotes ?? '');
  }, [row.id, row.reviewNotes]);

  return (
    <div className="bg-muted/10 px-3 py-2">
      {match?.issues.includes('collision') ? (
        <Text
          variant="body-sm"
          className="mb-2 text-amber-700 dark:text-amber-400"
        >
          Another row in this import uses the same external ID. Select one row
          and leave the other unselected.
        </Text>
      ) : null}
      {match?.issues.includes('invalidated_decision') ? (
        <Text
          variant="body-sm"
          className="mb-2 text-amber-700 dark:text-amber-400"
        >
          The saved match is no longer valid. Clear it or restore the original
          values to continue.
        </Text>
      ) : null}
      {match?.issues.includes('ambiguous_exact') ? (
        <Text
          variant="body-sm"
          className="mb-2 text-amber-700 dark:text-amber-400"
        >
          Multiple exact matches exist on this card. Review before continuing.
        </Text>
      ) : null}
      {exactExplanation ? (
        <Text variant="body-sm" className="mb-2 text-muted-foreground">
          {exactExplanation} Leave unselected to skip, or select to record as
          matched.
        </Text>
      ) : null}
      {advisory &&
      !row.reviewMatchDismissed &&
      !row.reviewMatchedTransactionId ? (
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
