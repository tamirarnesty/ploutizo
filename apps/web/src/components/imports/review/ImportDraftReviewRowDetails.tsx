import { memo } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import { getImportRowLabel } from '../lib/importPresentation';
import { ImportMatchReviewPanel } from './ImportMatchReviewPanel';
import { useImportDraftRowEvaluation } from './ImportDraftReviewContext';
import { useImportReviewTextDraft } from './useImportReviewTextDraft';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';
import { useImportReviewRowScope } from './ImportReviewRowScope';

export const ImportDraftReviewRowDetails = memo(() => {
  const { rowId, row } = useImportReviewRowScope();
  const { saveField, disabled } = useImportDraftReviewRowSave();
  const rowLabel = getImportRowLabel(row);
  const tagsInputId = `import-row-tags-${row.id}`;
  const evaluation = useImportDraftRowEvaluation(rowId);
  const refundSuggestion = evaluation?.refundSuggestion;
  const {
    draft: notesDraft,
    onChange: onNotesChange,
    onFocus: onNotesFocus,
    onBlur: onNotesBlur,
  } = useImportReviewTextDraft(
    row.reviewNotes,
    (next) => saveField({ reviewNotes: next }),
    row.id
  );

  const dismissMatch = () =>
    saveField({
      reviewMatchedTransactionId: null,
      reviewMatchDismissed: true,
    });

  return (
    <div className="@container flex flex-col gap-4 bg-muted/10 px-3 py-2">
      <ImportMatchReviewPanel
        disabled={disabled}
        onAcceptAdvisory={(transactionId) =>
          saveField({
            reviewMatchedTransactionId: transactionId,
            reviewMatchDismissed: false,
          })
        }
        onDismissMatch={dismissMatch}
      />
      {refundSuggestion?.kind === 'existing' &&
      refundSuggestion.transactionId &&
      !row.reviewRefundOf ? (
        <div className="flex flex-wrap items-center gap-2">
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
      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0">
          <Text
            as="label"
            htmlFor={`import-row-notes-${row.id}`}
            variant="body-sm"
            className="mb-2 block font-medium"
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
              onNotesChange(event.currentTarget.value);
            }}
            onFocus={onNotesFocus}
            onBlur={onNotesBlur}
          />
        </div>
        <div className="min-w-0">
          <Text
            as="label"
            htmlFor={tagsInputId}
            variant="body-sm"
            className="mb-2 block font-medium"
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
});

ImportDraftReviewRowDetails.displayName = 'ImportDraftReviewRowDetails';
