import { useEffect, useMemo, useState } from 'react';
import { DatePicker } from '@ploutizo/ui/components/date-picker';
import { Badge } from '@ploutizo/ui/components/badge';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { Input } from '@ploutizo/ui/components/input';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import { cn } from '@ploutizo/ui/lib/utils';
import { centsToDollars, dollarsToCents } from '@ploutizo/utils/currency';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import type { Category } from '@/lib/data-access/categories';
import { useUpdateImportDraftRow } from '@/lib/data-access/imports';
import { ImportAssigneeField } from './ImportAssigneeField';
import { ImportReviewTagPicker } from './ImportReviewTagPicker';
import {
  importStatusVariant,
  renderImportTransactionTypeBadgeProps,
  resolveCategoryIdByName,
  resolveImportRowType,
} from './importPresentation';

const ImportTransactionTypeBadge = ({ row }: { row: ImportDraftRow }) => {
  const type = resolveImportRowType(row);
  if (!type) {
    return row.sourceType ?? '—';
  }

  const { label, variant, className } =
    renderImportTransactionTypeBadgeProps(type);

  return variant ? (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  ) : (
    <Badge className={className}>{label}</Badge>
  );
};

interface ImportDraftReviewRowProps {
  draftId: string;
  row: ImportDraftRow;
  categories: Category[];
  orgMembers: OrgMember[];
  selectable: boolean;
  onSelectionChange: (selectedForImport: boolean) => void;
}

export const ImportDraftReviewRow = ({
  draftId,
  row,
  categories,
  orgMembers,
  selectable,
  onSelectionChange,
}: ImportDraftReviewRowProps) => {
  const updateRow = useUpdateImportDraftRow();
  const rowKey = `${row.id}:${row.updatedAt}`;
  const disabled = row.status === 'invalid';

  const [description, setDescription] = useState(row.reviewDescription ?? '');
  const [notes, setNotes] = useState(row.reviewNotes ?? '');
  const [amount, setAmount] = useState<number | undefined>(() =>
    row.reviewAmount != null ? centsToDollars(row.reviewAmount) : undefined
  );

  const categoryId = useMemo(
    () => resolveCategoryIdByName(row.reviewCategoryName, categories),
    [categories, row.reviewCategoryName]
  );

  useEffect(() => {
    setDescription(row.reviewDescription ?? '');
    setNotes(row.reviewNotes ?? '');
    setAmount(
      row.reviewAmount != null ? centsToDollars(row.reviewAmount) : undefined
    );
  }, [rowKey]);

  const saveField = (body: UpdateImportDraftRowInput) => {
    updateRow.mutate({ draftId, rowId: row.id, body });
  };

  const reviewDate = row.reviewDate ?? row.parsedDate ?? '';

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-3 align-top">
        <Checkbox
          aria-label={`Select ${row.reviewDescription ?? row.sourceDescription ?? 'import row'}`}
          checked={row.selectedForImport}
          disabled={!selectable}
          onCheckedChange={(checked) => {
            onSelectionChange(checked === true);
          }}
        />
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
        <DatePicker
          id={`import-row-date-${row.id}`}
          value={reviewDate || undefined}
          disabled={disabled}
          onChange={(nextDate) => {
            if (nextDate === row.reviewDate) return;
            saveField({ reviewDate: nextDate });
          }}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <CurrencyInput
          id={`import-row-amount-${row.id}`}
          className="min-w-[120px]"
          disabled={disabled}
          value={amount}
          onChange={setAmount}
          onBlur={() => {
            if (amount === undefined || !Number.isFinite(amount)) {
              if (row.reviewAmount === null) return;
              saveField({ reviewAmount: null });
              return;
            }
            const nextAmount = dollarsToCents(amount);
            if (nextAmount === row.reviewAmount) return;
            saveField({ reviewAmount: nextAmount });
          }}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <ImportTransactionTypeBadge row={row} />
      </td>
      <td className="px-3 py-3 align-top">
        <Input
          value={description}
          disabled={disabled}
          autoComplete="off"
          onChange={(event) => setDescription(event.currentTarget.value)}
          onBlur={(event) => {
            const next = event.currentTarget.value.trim() || null;
            if (next === row.reviewDescription) return;
            saveField({ reviewDescription: next });
          }}
        />
        <details className="mt-2 text-xs text-muted-foreground">
          <summary>Source</summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-2">
            {JSON.stringify(row.rawData, null, 2)}
          </pre>
        </details>
      </td>
      <td className="px-3 py-3 align-top">
        <CategorySelect
          id={`import-row-category-${row.id}`}
          categories={categories}
          value={categoryId}
          disabled={disabled}
          onValueChange={(nextCategoryId) => {
            const category = categories.find(
              (option) => option.id === nextCategoryId
            );
            const nextName = category?.name ?? null;
            if (nextName === row.reviewCategoryName) return;
            saveField({ reviewCategoryName: nextName });
          }}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <ImportAssigneeField
          row={row}
          orgMembers={orgMembers}
          disabled={disabled}
          onSave={(assigneeHint) => {
            if (assigneeHint === row.reviewAssigneeHint) return;
            saveField({ reviewAssigneeHint: assigneeHint });
          }}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <Textarea
          value={notes}
          disabled={disabled}
          rows={2}
          className="min-h-9 resize-none"
          autoComplete="off"
          placeholder="Add a note…"
          onChange={(event) => setNotes(event.currentTarget.value)}
          onBlur={(event) => {
            const next = event.currentTarget.value.trim() || null;
            if (next === row.reviewNotes) return;
            saveField({ reviewNotes: next });
          }}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <div className={cn(disabled && 'pointer-events-none opacity-50')}>
          <ImportReviewTagPicker
            value={row.reviewTags}
            onChange={(nextTags) => {
              if (nextTags.join('|') === row.reviewTags.join('|')) return;
              saveField({ reviewTags: nextTags });
            }}
          />
        </div>
      </td>
    </tr>
  );
};
