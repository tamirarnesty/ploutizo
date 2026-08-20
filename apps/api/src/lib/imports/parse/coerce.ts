import {
  tryParseImportAmountToCents,
  tryParseImportIsoDate,
} from '@ploutizo/utils/import-coercion';
import {
  isImportRowStructurallyInvalid,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type { ImportTransactionType } from '@ploutizo/types';
import type { ParsedImportRow, SourceImportRow } from './types';
import { DomainError } from '@/lib/errors';

const parseType = (value: string | null): ImportTransactionType | null =>
  toImportTransactionType(value?.trim().toLowerCase());

const coerceRow = (row: SourceImportRow): ParsedImportRow => {
  const parsedDate = tryParseImportIsoDate(row.sourceDate);
  const parsedAmount = tryParseImportAmountToCents(row.sourceAmount);
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
