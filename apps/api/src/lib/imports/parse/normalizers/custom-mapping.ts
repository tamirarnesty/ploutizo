import {
  tryParseImportDmyDate,
  tryParseImportIsoDate,
  tryParseImportMdyDate,
} from '@ploutizo/utils/import-coercion';
import type {
  ImportAmountSemantics,
  ImportCustomMapping,
  ImportCustomMappingDateFormat,
} from '@ploutizo/types';
import {
  buildRawData,
  optionalTrim,
  readDebitCreditAmount,
  readSignedAmount,
} from './cells';
import type { CsvUpload, SourceImportRow } from '../types';
import { DomainError } from '@/lib/errors';

const DATE_PARSERS: Record<
  ImportCustomMappingDateFormat,
  (value: string | null) => string | null
> = {
  'YYYY-MM-DD': tryParseImportIsoDate,
  'MM/DD/YYYY': tryParseImportMdyDate,
  'DD/MM/YYYY': tryParseImportDmyDate,
};

const requireColumnIndex = (headers: string[], column: string): number => {
  const idx = headers.findIndex(
    (header) => header.trim().toLowerCase() === column.trim().toLowerCase()
  );
  if (idx === -1) {
    throw new DomainError(
      400,
      `Column "${column}" was not found in this file.`,
      'IMPORT_INVALID_SELECTION'
    );
  }
  return idx;
};

const buildAmountReader = (
  headers: string[],
  amount: ImportAmountSemantics
) => {
  if (amount.kind === 'signed') {
    const idx = requireColumnIndex(headers, amount.column);
    const { positiveIsExpense } = amount;
    return (cells: string[]) =>
      readSignedAmount(optionalTrim(cells[idx]), positiveIsExpense);
  }

  const debitIdx = requireColumnIndex(headers, amount.debitColumn);
  const creditIdx = requireColumnIndex(headers, amount.creditColumn);
  return (cells: string[]) =>
    readDebitCreditAmount(
      optionalTrim(cells[debitIdx]),
      optionalTrim(cells[creditIdx])
    );
};

export type CustomMappingNormalizer = {
  parseDate: (value: string | null) => string | null;
  normalize: (upload: CsvUpload) => SourceImportRow[];
};

/**
 * Build a one-shot normalizer from a member-supplied custom mapping.
 * Validates that all required columns exist in the file; throws on failure.
 */
export const buildCustomMappingNormalizer = (
  upload: CsvUpload,
  mapping: ImportCustomMapping
): CustomMappingNormalizer => {
  const headers = upload.headers;
  const dateIdx = requireColumnIndex(headers, mapping.dateColumn);
  const descIdx = requireColumnIndex(headers, mapping.descriptionColumn);
  const extIdIdx =
    mapping.externalIdColumn !== undefined
      ? requireColumnIndex(headers, mapping.externalIdColumn)
      : -1;

  const readAmount = buildAmountReader(headers, mapping.amount);
  const parseDate = DATE_PARSERS[mapping.dateFormat];

  const normalize = (csvUpload: CsvUpload): SourceImportRow[] => {
    const dataRecords = csvUpload.hasHeaderRow
      ? csvUpload.records.slice(1)
      : csvUpload.records;

    return dataRecords.map((record) => {
      const { sourceAmount, sourceType } = readAmount(record.cells);
      return {
        rowNumber: record.rowNumber,
        rawData: buildRawData(record, csvUpload.headers),
        externalId: extIdIdx >= 0 ? optionalTrim(record.cells[extIdIdx]) : null,
        sourceDate: optionalTrim(record.cells[dateIdx]),
        sourceAmount,
        sourceDescription: optionalTrim(record.cells[descIdx]),
        sourceType,
      };
    });
  };

  return { parseDate, normalize };
};
