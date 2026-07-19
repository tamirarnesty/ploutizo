import { useEffect, useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import { cn } from '@ploutizo/ui/lib/utils';
import type { ImportDraftRow } from '@ploutizo/types';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';

interface ImportDraftReviewRowDetailsProps {
  row: ImportDraftRow;
}

const getImportRowLabel = (row: ImportDraftRow) =>
  row.reviewDescription ?? row.sourceDescription ?? 'import row';

export const ImportDraftReviewRowDetails = ({
  row,
}: ImportDraftReviewRowDetailsProps) => {
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  // Input chrome only — every change also writes the working copy.
  const [notesDraft, setNotesDraft] = useState(() => row.reviewNotes ?? '');
  const rowLabel = getImportRowLabel(row);
  const tagsInputId = `import-row-tags-${row.id}`;

  useEffect(() => {
    setNotesDraft(row.reviewNotes ?? '');
  }, [row.id, row.reviewNotes]);

  return (
    <div className="bg-muted/10 px-3 py-2">
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
          <div className={cn(disabled && 'pointer-events-none opacity-50')}>
            <TransactionTagPicker
              value={row.reviewTagIds}
              allowCreate={false}
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
    </div>
  );
};
