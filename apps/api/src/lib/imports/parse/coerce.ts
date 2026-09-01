import {
  trimApostrophes,
  tryParseImportAmountToCents,
  tryParseImportDate,
} from '@ploutizo/utils/import-coercion';
import {
  isImportRowStructurallyInvalid,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type { ImportCsvHints } from '@ploutizo/utils';
import type { ImportTransactionType } from '@ploutizo/types';
import type { ParsedImportRow, SourceImportRow } from './types';
import { DomainError } from '@/lib/errors';

const EMPTY_HINTS: ImportCsvHints = {
  csvCategoryName: null,
  csvAssigneeName: null,
  csvTagNames: [],
};

const parseType = (value: string | null): ImportTransactionType | null =>
  toImportTransactionType(value?.trim().toLowerCase());

const coerceRow = (row: SourceImportRow): ParsedImportRow => {
  const { hints, reviewRefundLinkHint, reviewNotes, ...source } = row;
  const parsedDate = tryParseImportDate(row.sourceDate);
  const parsedAmount = tryParseImportAmountToCents(row.sourceAmount);
  const parsedType = parseType(row.sourceType);
  const parsedDescription = row.sourceDescription;
  const csvHints = hints ?? EMPTY_HINTS;

  return {
    ...source,
    externalId: trimApostrophes(row.externalId),
    parsedDate,
    parsedAmount,
    parsedType,
    parsedDescription,
    reviewDate: parsedDate,
    reviewAmount: parsedAmount,
    reviewType: null,
    reviewDescription: null,
    csvCategoryName: csvHints.csvCategoryName,
    csvAssigneeName: csvHints.csvAssigneeName,
    csvTagNames: csvHints.csvTagNames,
    reviewRefundLinkHint: reviewRefundLinkHint ?? null,
    reviewNotes: reviewNotes ?? null,
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
