import {
  isImportRowStructurallyInvalid,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type { ImportTransactionType } from '@ploutizo/types';
import type { ParsedImportRow, SourceImportRow } from './types';
import { DomainError } from '@/lib/errors';

const parseIsoDate = (value: string | null): string | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
};

const parseAmountCents = (value: string | null): number | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!/^\$?\s*(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/.test(raw)) return null;
  const normalized = raw.replace(/^\$\s*/, '').replace(/,/g, '');
  const [dollars, cents = ''] = normalized.split('.');
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
};

const parseType = (value: string | null): ImportTransactionType | null =>
  toImportTransactionType(value?.trim().toLowerCase());

const coerceRow = (row: SourceImportRow): ParsedImportRow => {
  const parsedDate = parseIsoDate(row.sourceDate);
  const parsedAmount = parseAmountCents(row.sourceAmount);
  const parsedType = parseType(row.sourceType);
  const parsedDescription = row.sourceDescription;

  return {
    rowNumber: row.rowNumber,
    rawData: row.rawData,
    externalId: row.externalId,
    sourceDate: row.sourceDate,
    sourceAmount: row.sourceAmount,
    sourceDescription: row.sourceDescription,
    sourceType: row.sourceType,
    parsedDate,
    parsedAmount,
    parsedType,
    parsedDescription,
    reviewDate: parsedDate,
    reviewAmount: parsedAmount,
    reviewType: parsedType,
    reviewDescription: parsedDescription,
    csvCategoryName: row.csvCategoryName,
    csvAssigneeName: row.csvAssigneeName,
    csvTagNames: row.csvTagNames,
    reviewRefundLinkHint: row.reviewRefundLinkHint,
    reviewNotes: row.reviewNotes,
  };
};

export const coerceImportRows = (
  rows: SourceImportRow[]
): ParsedImportRow[] => {
  const coercedRows = rows.map(coerceRow);
  const hasImportableRow = coercedRows.some(
    (row) => !isImportRowStructurallyInvalid(row)
  );

  if (!hasImportableRow) {
    throw new DomainError(
      400,
      'No importable rows were found in the CSV file.',
      'IMPORT_FILE_EMPTY'
    );
  }

  return coercedRows;
};
