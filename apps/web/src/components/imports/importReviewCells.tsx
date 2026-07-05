import { useCallback, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
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
import { cn } from '@ploutizo/ui/lib/utils';
import { dollarsToCents } from '@ploutizo/utils/currency';
import { IMPORT_TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import type { ImportDraftRow, ImportTransactionType } from '@ploutizo/types';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import { useRegisterInputFlush } from '@/lib/money/pending-input-flush';
import { ImportAssigneeField } from './ImportAssigneeField';
import { ImportRowStatusIcon } from './ImportRowStatusIcon';
import { useImportDraftReviewContext } from './ImportDraftReviewContext';
import {
  formatImportTransactionTypeLabel,
  resolveCategoryIdByName,
  resolveImportRowOriginalDescription,
  resolveImportRowType,
} from './importPresentation';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';
import { useImportRowFieldState } from './useImportRowFieldState';

const getImportRowLabel = (row: ImportDraftRow) =>
  row.reviewDescription ?? row.sourceDescription ?? 'import row';

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

interface ImportReviewSelectionCellProps {
  row: ImportDraftRow;
  expanded: boolean;
  selectable: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectionChange: (selected: boolean) => void;
}

export const ImportReviewSelectionCell = ({
  row,
  expanded,
  selectable,
  onExpandedChange,
  onSelectionChange,
}: ImportReviewSelectionCellProps) => {
  const rowLabel = getImportRowLabel(row);
  const expandLabel = expanded
    ? `Collapse details for ${rowLabel}`
    : `Expand details for ${rowLabel}`;

  return (
    <div className="flex items-center gap-1">
      <Checkbox
        aria-label={`Select ${rowLabel}`}
        checked={row.selectedForImport}
        disabled={!selectable}
        onCheckedChange={(checked) => {
          onSelectionChange(checked === true);
        }}
      />
      <ImportRowStatusIcon row={row} />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
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
      </Button>
    </div>
  );
};

interface ImportReviewDateCellProps {
  row: ImportDraftRow;
}

export const ImportReviewDateCell = ({ row }: ImportReviewDateCellProps) => {
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const rowLabel = getImportRowLabel(row);
  const reviewDate = row.reviewDate ?? row.parsedDate ?? '';

  return (
    <DatePicker
      id={`import-row-date-${row.id}`}
      aria-label={`Date for ${rowLabel}`}
      value={reviewDate || undefined}
      disabled={disabled}
      onChange={(nextDate) => {
        if (nextDate === row.reviewDate) return;
        saveField({ reviewDate: nextDate });
      }}
    />
  );
};

interface ImportReviewAmountCellProps {
  row: ImportDraftRow;
}

export const ImportReviewAmountCell = ({
  row,
}: ImportReviewAmountCellProps) => {
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const { amount, setAmount, markSaved } = useImportRowFieldState(row);
  const rowLabel = getImportRowLabel(row);

  return (
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
          saveField(
            { reviewAmount: null },
            { onSuccess: () => markSaved('amount') }
          );
          return;
        }
        const nextAmount = dollarsToCents(amount);
        if (nextAmount === row.reviewAmount) return;
        saveField(
          { reviewAmount: nextAmount },
          { onSuccess: () => markSaved('amount') }
        );
      }}
    />
  );
};

interface ImportReviewTypeCellProps {
  row: ImportDraftRow;
}

export const ImportReviewTypeCell = ({ row }: ImportReviewTypeCellProps) => {
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const rowLabel = getImportRowLabel(row);

  return (
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
  );
};

interface ImportReviewDescriptionCellProps {
  row: ImportDraftRow;
}

export const ImportReviewDescriptionCell = ({
  row,
}: ImportReviewDescriptionCellProps) => {
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const { description, setDescription, markSaved } =
    useImportRowFieldState(row);
  const rowLabel = getImportRowLabel(row);
  const originalDescription = resolveImportRowOriginalDescription(row);
  const showOriginalDescription =
    originalDescription != null &&
    description.trim() !== originalDescription.trim();

  const flushDescription = useCallback(() => {
    const next = description.trim() || null;
    if (next === row.reviewDescription) return;
    saveField(
      { reviewDescription: next },
      { onSuccess: () => markSaved('description') }
    );
  }, [description, markSaved, row.reviewDescription, saveField]);

  useRegisterInputFlush(flushDescription);

  return (
    <>
      <Input
        id={`import-row-description-${row.id}`}
        aria-label={`Description for ${rowLabel}`}
        className="w-full"
        value={description}
        disabled={disabled}
        autoComplete="off"
        onChange={(event) => setDescription(event.currentTarget.value)}
        onBlur={flushDescription}
      />
      {showOriginalDescription ? (
        <Text variant="body-sm" className="mt-1 text-muted-foreground">
          Original: {originalDescription}
        </Text>
      ) : null}
    </>
  );
};

interface ImportReviewCategoryCellProps {
  row: ImportDraftRow;
}

export const ImportReviewCategoryCell = ({
  row,
}: ImportReviewCategoryCellProps) => {
  const { categories } = useImportDraftReviewContext();
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const rowLabel = getImportRowLabel(row);
  const categoryId = useMemo(
    () => resolveCategoryIdByName(row.reviewCategoryName, categories),
    [categories, row.reviewCategoryName]
  );

  return (
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
  );
};

interface ImportReviewAssigneeCellProps {
  row: ImportDraftRow;
}

export const ImportReviewAssigneeCell = ({
  row,
}: ImportReviewAssigneeCellProps) => {
  const { orgMembers } = useImportDraftReviewContext();
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const rowLabel = getImportRowLabel(row);

  return (
    <ImportAssigneeField
      row={row}
      orgMembers={orgMembers}
      disabled={disabled}
      ariaLabel={`Assignees for ${rowLabel}`}
      onSave={(memberIds) => {
        if (memberIds.join('|') === row.reviewAssigneeMemberIds.join('|')) {
          return;
        }
        saveField({ reviewAssigneeMemberIds: memberIds });
      }}
    />
  );
};
