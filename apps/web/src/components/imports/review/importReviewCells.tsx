import { useEffect, useState } from 'react';
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
import { formatTransactionTypeLabel } from '@ploutizo/utils';
import { centsToDollars, dollarsToCents } from '@ploutizo/utils/currency';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
} from '@ploutizo/utils/import-row-status';
import { IMPORT_TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import type { ImportDraftRow, ImportTransactionType } from '@ploutizo/types';
import { CategorySelect } from '@/components/categories/CategorySelect';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import {
  getImportRowLabel,
  resolveImportRowOriginalDescription,
} from '../lib/importPresentation';
import { ImportAssigneeField } from './ImportAssigneeField';
import { useImportDraftReviewContext } from './ImportDraftReviewContext';
import { ImportRowStatusIcon } from './ImportRowStatusIcon';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';

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
        {value ? formatTransactionTypeLabel(value) : 'Select type'}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {IMPORT_TRANSACTION_TYPE_VALUES.map((type) => (
        <SelectItem key={type} value={type}>
          {formatTransactionTypeLabel(type)}
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
  const reviewDate = resolveImportRowReviewDate(row) ?? '';

  return (
    <DatePicker
      id={`import-row-date-${row.id}`}
      aria-label={`Date for ${rowLabel}`}
      value={reviewDate || undefined}
      disabled={disabled}
      onChange={(nextDate) => {
        const next = nextDate || null;
        if (next === resolveImportRowReviewDate(row)) return;
        saveField({ reviewDate: next });
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
  const [amountDraft, setAmountDraft] = useState<number | undefined>(() =>
    row.reviewAmount != null ? centsToDollars(row.reviewAmount) : undefined
  );
  const rowLabel = getImportRowLabel(row);

  useEffect(() => {
    setAmountDraft(
      row.reviewAmount != null ? centsToDollars(row.reviewAmount) : undefined
    );
  }, [row.id, row.reviewAmount]);

  return (
    <CurrencyInput
      id={`import-row-amount-${row.id}`}
      aria-label={`Amount for ${rowLabel}`}
      className="w-32"
      disabled={disabled}
      value={amountDraft}
      onChange={(next) => {
        setAmountDraft(next);
        if (next === undefined || !Number.isFinite(next)) {
          return;
        }
        const nextAmount = dollarsToCents(next);
        if (nextAmount !== row.reviewAmount) {
          saveField({ reviewAmount: nextAmount });
        }
      }}
      onBlur={() => {
        if (amountDraft === undefined || !Number.isFinite(amountDraft)) {
          if (row.reviewAmount !== null) {
            saveField({ reviewAmount: null });
          }
        }
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
      value={resolveImportRowReviewType(row)}
      disabled={disabled}
      ariaLabel={`Type for ${rowLabel}`}
      onChange={(nextType) => {
        if (nextType === resolveImportRowReviewType(row)) return;
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
  const [descriptionDraft, setDescriptionDraft] = useState(
    () => row.reviewDescription ?? ''
  );
  const rowLabel = getImportRowLabel(row);
  const originalDescription = resolveImportRowOriginalDescription(row);
  const showOriginalDescription =
    originalDescription != null &&
    descriptionDraft.trim() !== originalDescription.trim();

  useEffect(() => {
    setDescriptionDraft(row.reviewDescription ?? '');
  }, [row.id, row.reviewDescription]);

  return (
    <>
      <Input
        id={`import-row-description-${row.id}`}
        aria-label={`Description for ${rowLabel}`}
        className="w-full"
        value={descriptionDraft}
        disabled={disabled}
        autoComplete="off"
        onChange={(event) => {
          const raw = event.currentTarget.value;
          setDescriptionDraft(raw);
          const next = raw.trim() || null;
          if (next === row.reviewDescription) return;
          saveField({ reviewDescription: next });
        }}
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

  return (
    <CategorySelect
      id={`import-row-category-${row.id}`}
      ariaLabel={`Category for ${rowLabel}`}
      triggerClassName="w-44"
      categories={categories}
      value={row.reviewCategoryId ?? ''}
      disabled={disabled}
      onValueChange={(nextCategoryId) => {
        const nextId = nextCategoryId || null;
        if (nextId === row.reviewCategoryId) return;
        saveField({ reviewCategoryId: nextId });
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
