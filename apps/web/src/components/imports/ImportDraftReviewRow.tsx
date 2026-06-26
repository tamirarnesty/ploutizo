import { useEffect, useState } from 'react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Input } from '@ploutizo/ui/components/input';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import { parseImportTags } from '@ploutizo/utils';
import { formatCurrency } from '@ploutizo/utils/currency';
import type { ImportDraftRow } from '@ploutizo/types';
import { useUpdateImportDraftRow } from '@/lib/data-access/imports';
import { importStatusVariant } from './importPresentation';

interface ImportDraftReviewRowProps {
  draftId: string;
  row: ImportDraftRow;
}

type StringReviewField =
  | 'reviewDescription'
  | 'reviewCategoryName'
  | 'reviewAssigneeHint'
  | 'reviewNotes';

export const ImportDraftReviewRow = ({
  draftId,
  row,
}: ImportDraftReviewRowProps) => {
  const updateRow = useUpdateImportDraftRow();
  const rowKey = `${row.id}:${row.updatedAt}`;
  const disabled = row.status === 'invalid';

  const [description, setDescription] = useState(row.reviewDescription ?? '');
  const [category, setCategory] = useState(row.reviewCategoryName ?? '');
  const [assignee, setAssignee] = useState(row.reviewAssigneeHint ?? '');
  const [notes, setNotes] = useState(row.reviewNotes ?? '');
  const [tags, setTags] = useState(row.reviewTags.join('; '));

  useEffect(() => {
    setDescription(row.reviewDescription ?? '');
    setCategory(row.reviewCategoryName ?? '');
    setAssignee(row.reviewAssigneeHint ?? '');
    setNotes(row.reviewNotes ?? '');
    setTags(row.reviewTags.join('; '));
  }, [rowKey]);

  const saveStringField = (field: StringReviewField, value: string) => {
    const next = value.trim() || null;
    if (next === row[field]) return;
    updateRow.mutate({ draftId, rowId: row.id, body: { [field]: next } });
  };

  const saveTags = (value: string) => {
    const next = parseImportTags(value);
    if (next.join('|') === row.reviewTags.join('|')) return;
    updateRow.mutate({ draftId, rowId: row.id, body: { reviewTags: next } });
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-3 align-top font-mono text-xs text-muted-foreground">
        {row.rowNumber}
      </td>
      <td className="px-3 py-3 align-top">
        <Badge variant={importStatusVariant(row.status)}>
          {row.status.replace('_', ' ')}
        </Badge>
        {row.invalidReason ? (
          <Text
            variant="body-sm"
            className="mt-2 max-w-[180px] text-destructive"
          >
            {row.invalidReason}
          </Text>
        ) : null}
      </td>
      <td className="px-3 py-3 align-top">
        {row.reviewDate ?? row.sourceDate ?? '—'}
      </td>
      <td className="px-3 py-3 text-right align-top">
        {row.reviewAmount != null
          ? formatCurrency(row.reviewAmount)
          : (row.sourceAmount ?? '—')}
      </td>
      <td className="px-3 py-3 align-top">
        {row.reviewType ?? row.sourceType ?? '—'}
      </td>
      <td className="px-3 py-3 align-top">
        <Input
          value={description}
          disabled={disabled}
          onChange={(event) => setDescription(event.currentTarget.value)}
          onBlur={(event) =>
            saveStringField('reviewDescription', event.currentTarget.value)
          }
        />
        <details className="mt-2 text-xs text-muted-foreground">
          <summary>Source</summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-2">
            {JSON.stringify(row.rawData, null, 2)}
          </pre>
        </details>
      </td>
      <td className="px-3 py-3 align-top">
        <Input
          value={category}
          disabled={disabled}
          onChange={(event) => setCategory(event.currentTarget.value)}
          onBlur={(event) =>
            saveStringField('reviewCategoryName', event.currentTarget.value)
          }
        />
      </td>
      <td className="px-3 py-3 align-top">
        <Input
          value={assignee}
          disabled={disabled}
          onChange={(event) => setAssignee(event.currentTarget.value)}
          onBlur={(event) =>
            saveStringField('reviewAssigneeHint', event.currentTarget.value)
          }
        />
      </td>
      <td className="px-3 py-3 align-top">
        <Textarea
          value={notes}
          disabled={disabled}
          className="min-h-9"
          onChange={(event) => setNotes(event.currentTarget.value)}
          onBlur={(event) =>
            saveStringField('reviewNotes', event.currentTarget.value)
          }
        />
      </td>
      <td className="px-3 py-3 align-top">
        <Input
          value={tags}
          disabled={disabled}
          onChange={(event) => setTags(event.currentTarget.value)}
          onBlur={(event) => saveTags(event.currentTarget.value)}
        />
      </td>
    </tr>
  );
};
