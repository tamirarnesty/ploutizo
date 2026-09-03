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
import { buildRawData, optionalTrim, toAbsoluteAmountSource } from './cells';
import type {
  CsvUpload,
  ImportContentProfile,
  SourceImportRow,
} from '../types';
import { DomainError } from '@/lib/errors';

const DATE_PARSERS: Record<
  ImportCustomMappingDateFormat,
  (value: string | null) => string | null
> = {
  'YYYY-MM-DD': tryParseImportIsoDate,
  'MM/DD/YYYY': tryParseImportMdyDate,
  'DD/MM/YYYY': tryParseImportDmyDate,
};

const getColumnIndex = (headers: string[], column: string): number => {
  const idx = headers.findIndex(
    (h) => h.trim().toLowerCase() === column.trim().toLowerCase()
  );
  return idx;
};

const requireColumnIndex = (headers: string[], column: string): number => {
  const idx = getColumnIndex(headers, column);
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
    const idx = requireColumnIndex(headers, 'amount');
    const positiveIsExpense = amount.positiveIsExpense;
    return (
      cells: string[]
    ): Pick<SourceImportRow, 'sourceAmount' | 'sourceType'> => {
      const raw = optionalTrim(cells[idx]);
      const { sourceAmount, isNegative } = toAbsoluteAmountSource(raw);
      let sourceType: string | null = null;
      if (sourceAmount) {
        sourceType = (isNegative ? !positiveIsExpense : positiveIsExpense)
          ? 'expense'
          : 'refund';
      }
      return { sourceAmount, sourceType };
    };
  } else {
    const debitIdx = requireColumnIndex(headers, amount.debitColumn);
    const creditIdx = requireColumnIndex(headers, amount.creditColumn);
    return (
      cells: string[]
    ): Pick<SourceImportRow, 'sourceAmount' | 'sourceType'> => {
      const debitRaw = optionalTrim(cells[debitIdx]);
      const creditRaw = optionalTrim(cells[creditIdx]);
      const { sourceAmount: debitAmt } = toAbsoluteAmountSource(debitRaw);
      const { sourceAmount: creditAmt } = toAbsoluteAmountSource(creditRaw);
      const hasDebit = debitAmt != null;
      const hasCredit = creditAmt != null;
      if (hasDebit === hasCredit) {
        return { sourceAmount: null, sourceType: null };
      }
      return {
        sourceAmount: hasDebit ? debitAmt : creditAmt,
        sourceType: hasDebit ? 'expense' : 'refund',
      };
    };
  }
};

/**
 * Build a one-shot `ImportContentProfile` from a member-supplied custom mapping.
 * Validates that all required columns exist in the file; throws on failure.
 */
export const buildCustomMappingProfile = (
  upload: CsvUpload,
  mapping: ImportCustomMapping
): ImportContentProfile => {
  const headers = upload.headers;
  const dateIdx = requireColumnIndex(headers, mapping.dateColumn);
  const descIdx = requireColumnIndex(headers, mapping.descriptionColumn);
  const extIdIdx =
    mapping.externalIdColumn !== undefined
      ? requireColumnIndex(headers, mapping.externalIdColumn)
      : -1;

  const readAmount = buildAmountReader(headers, mapping.amount);
  const parseDate = DATE_PARSERS[mapping.dateFormat];

  const normalize = (csvUpload: CsvUpload): SourceImportRow[] =>
    csvUpload.records.slice(1).map((record) => {
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

  return {
    profileId: 'internal', // custom mappings produce the generic internal contract
    matches: () => true, // always matches when explicitly selected
    parseDate,
    normalize,
  };
};
