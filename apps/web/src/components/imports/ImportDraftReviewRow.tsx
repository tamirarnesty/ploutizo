import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DatePicker } from '@ploutizo/ui/components/date-picker';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { Input } from '@ploutizo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import { cn } from '@ploutizo/ui/lib/utils';
import { centsToDollars, dollarsToCents } from '@ploutizo/utils/currency';
import { IMPORT_TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import type {
  ImportDraftRow,
  ImportTransactionType,
  OrgMember,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import type { Category } from '@/lib/data-access/categories';
import { useUpdateImportDraftRow } from '@/lib/data-access/imports';
import { ImportAssigneeField } from './ImportAssigneeField';
import { ImportReviewTagPicker } from './ImportReviewTagPicker';
import { ImportRowStatusIcon } from './ImportRowStatusIcon';
import {
  formatImportTransactionTypeLabel,
  resolveCategoryIdByName,
  resolveImportRowOriginalDescription,
  resolveImportRowType,
} from './importPresentation';

const DETAIL_ROW_COLUMN_COUNT = 7;
const STICKY_SELECTION_CELL_CLASSNAME =
  'sticky left-0 z-10 w-[88px] min-w-[88px] bg-background px-2 py-3 align-top shadow-[1px_0_0_var(--border)]';

interface ImportTransactionTypeSelectProps {
  id: string;
  value: ImportTransactionType | null;
  disabled: boolean;
  ariaLabel: string;
  onChange: (type: ImportTransactionType) => void;
}

const ImportTransactionTypeSelect = ({
  id,
  value,
  disabled,
  ariaLabel,
  onChange,
}: ImportTransactionTypeSelectProps) => (
  <Select
    value={value ?? ''}
    disabled={disabled}
    onValueChange={(next) => onChange(next as ImportTransactionType)}
  >
    <SelectTrigger id={id} className="w-36" aria-label={ariaLabel}>
      <SelectValue>
        {value ? formatImportTransactionTypeLabel(value) : 'Select type'}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {IMPORT_TRANSACTION_TYPE_VALUES.map((type) => (
        <SelectItem key={type} value={type}>
          {formatImportTransactionTypeLabel(type)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface ImportDraftReviewRowProps {
  draftId: string;
  row: ImportDraftRow;
  categories: Category[];
  orgMembers: OrgMember[];
  selectable: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectionChange: (selectedForImport: boolean) => void;
}

export const ImportDraftReviewRow = ({
  draftId,
  row,
  categories,
  orgMembers,
  selectable,
  expanded,
  onExpandedChange,
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
  const originalDescription = resolveImportRowOriginalDescription(row);
  const showOriginalDescription =
    originalDescription != null &&
    description.trim() !== originalDescription.trim();

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
  const rowLabel =
    row.reviewDescription ?? row.sourceDescription ?? 'import row';
  const expandLabel = expanded
    ? `Collapse details for ${rowLabel}`
    : `Expand details for ${rowLabel}`;

  return (
    <Fragment>
      <tr className="border-b border-border last:border-0">
        <td className={STICKY_SELECTION_CELL_CLASSNAME}>
          <div className="flex items-start gap-2">
            <Checkbox
              aria-label={`Select ${rowLabel}`}
              checked={row.selectedForImport}
              disabled={!selectable}
              onCheckedChange={(checked) => {
                onSelectionChange(checked === true);
              }}
            />
            <div className="flex flex-col items-center gap-1">
              <ImportRowStatusIcon row={row} />
              <button
                type="button"
                className="rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-expanded={expanded}
                aria-label={expandLabel}
                onClick={() => onExpandedChange(!expanded)}
              >
                <ChevronDown
                  className={cn(
                    'size-4 transition-transform',
                    !expanded && '-rotate-90'
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </td>
        <td className="w-[150px] min-w-[150px] px-3 py-3 align-top">
          <DatePicker
            id={`import-row-date-${row.id}`}
            aria-label={`Date for ${rowLabel}`}
            value={reviewDate || undefined}
            disabled={disabled}
            className="w-32"
            onChange={(nextDate) => {
              if (nextDate === row.reviewDate) return;
              saveField({ reviewDate: nextDate });
            }}
          />
        </td>
        <td className="w-[150px] min-w-[150px] px-3 py-3 align-top">
          <CurrencyInput
            id={`import-row-amount-${row.id}`}
            aria-label={`Amount for ${rowLabel}`}
            className="w-32"
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
        <td className="w-[160px] min-w-[160px] px-3 py-3 align-top">
          <ImportTransactionTypeSelect
            id={`import-row-type-${row.id}`}
            value={resolveImportRowType(row)}
            disabled={disabled}
            ariaLabel={`Type for ${rowLabel}`}
            onChange={(nextType) => {
              if (nextType === row.reviewType) return;
              saveField({ reviewType: nextType });
            }}
          />
        </td>
        <td className="w-[300px] min-w-[300px] px-3 py-3 align-top">
          <Input
            id={`import-row-description-${row.id}`}
            aria-label={`Description for ${rowLabel}`}
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
          {showOriginalDescription ? (
            <Text variant="body-sm" className="mt-1 text-muted-foreground">
              Original: {originalDescription}
            </Text>
          ) : null}
        </td>
        <td className="w-[220px] min-w-[220px] px-3 py-3 align-top">
          <CategorySelect
            id={`import-row-category-${row.id}`}
            ariaLabel={`Category for ${rowLabel}`}
            triggerClassName="w-44"
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
        <td className="w-[300px] min-w-[300px] px-3 py-3 align-top">
          <ImportAssigneeField
            row={row}
            orgMembers={orgMembers}
            disabled={disabled}
            ariaLabel={`Assignees for ${rowLabel}`}
            onSave={(memberIds) => {
              if (
                memberIds.join('|') === row.reviewAssigneeMemberIds.join('|')
              ) {
                return;
              }
              saveField({ reviewAssigneeMemberIds: memberIds });
            }}
          />
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-border bg-muted/10 last:border-0">
          <td colSpan={DETAIL_ROW_COLUMN_COUNT} className="px-3 py-2">
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
                  value={notes}
                  disabled={disabled}
                  rows={1}
                  className="h-10 min-h-10 w-full resize-y"
                  autoComplete="off"
                  placeholder="Add a note…"
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  onBlur={(event) => {
                    const next = event.currentTarget.value.trim() || null;
                    if (next === row.reviewNotes) return;
                    saveField({ reviewNotes: next });
                  }}
                />
              </div>
              <div className="min-w-0">
                <Text variant="body-sm" className="mb-1.5 block font-medium">
                  Tags
                </Text>
                <div
                  className={cn(disabled && 'pointer-events-none opacity-50')}
                >
                  <ImportReviewTagPicker
                    value={row.reviewTags}
                    inputAriaLabel={`Tags for ${rowLabel}`}
                    onChange={(nextTags) => {
                      if (nextTags.join('|') === row.reviewTags.join('|')) {
                        return;
                      }
                      saveField({ reviewTags: nextTags });
                    }}
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
};
