import {
  isImportAmountToken,
  looksLikeImportIsoDate,
  looksLikeImportMdyDate,
  tryParseImportAmountToCents,
  tryParseImportIsoDate,
  tryParseImportMdyDate,
} from '@ploutizo/utils/import-coercion';
import type { FinancialInstitutionId } from '@ploutizo/types';
import { buildRawData, optionalTrim, toAbsoluteAmountSource } from './cells';
import type {
  CsvRecord,
  CsvUpload,
  ImportNormalizer,
  SourceImportRow,
} from '../types';

const HEADERLESS_COLUMN_COUNT = 5;

const isFiveColumnHeaderless = (upload: CsvUpload) =>
  upload.records.length > 0 &&
  upload.records.every(
    (record) => record.cells.length === HEADERLESS_COLUMN_COUNT
  );

const firstCell = (record: CsvRecord | undefined) =>
  optionalTrim(record?.cells[0]);

const hasNonEmptyDescription = (record: CsvRecord) =>
  optionalTrim(record.cells[1]) != null;

const hasImportAmount = (value: string | null) =>
  tryParseImportAmountToCents(toAbsoluteAmountSource(value).sourceAmount) !=
  null;

const hasMonetaryAmount = (value: string | null) =>
  isImportAmountToken(toAbsoluteAmountSource(value).sourceAmount);

const hasExclusiveDebitOrCredit = (record: CsvRecord) => {
  const hasDebit = hasImportAmount(optionalTrim(record.cells[2]));
  const hasCredit = hasImportAmount(optionalTrim(record.cells[3]));
  return hasDebit !== hasCredit;
};

type HeaderlessFormatSignature = {
  looksLikeOwnDate: (value: string | null) => boolean;
  looksLikeOtherDate: (value: string | null) => boolean;
  parseDate: (value: string | null) => string | null;
  hasAccountMarker: (record: CsvRecord) => boolean;
};

const matchesHeaderless = (
  upload: CsvUpload,
  signature: HeaderlessFormatSignature
) => {
  if (!isFiveColumnHeaderless(upload)) return false;

  return (
    upload.records.every((record) => {
      const date = firstCell(record);
      return (
        signature.looksLikeOwnDate(date) &&
        !signature.looksLikeOtherDate(date) &&
        hasNonEmptyDescription(record) &&
        signature.hasAccountMarker(record)
      );
    }) &&
    upload.records.some(
      (record) =>
        signature.parseDate(firstCell(record)) != null &&
        hasExclusiveDebitOrCredit(record)
    )
  );
};

const mapHeaderlessRow = (record: CsvRecord): SourceImportRow => {
  const debit = optionalTrim(record.cells[2]);
  const credit = optionalTrim(record.cells[3]);
  const hasDebit = debit != null;
  const hasCredit = credit != null;
  const exclusiveAmount = hasDebit === hasCredit ? null : (debit ?? credit);
  const { sourceAmount } = toAbsoluteAmountSource(exclusiveAmount);

  return {
    rowNumber: record.rowNumber,
    rawData: buildRawData(record, [
      'date',
      'description',
      'debit',
      'credit',
      'column_5',
    ]),
    externalId: null,
    sourceDate: optionalTrim(record.cells[0]),
    sourceAmount,
    sourceDescription: optionalTrim(record.cells[1]),
    sourceType:
      exclusiveAmount == null ? null : hasDebit ? 'expense' : 'refund',
  };
};

const createHeaderlessNormalizer = (
  detectedInstitutionId: FinancialInstitutionId,
  signature: HeaderlessFormatSignature
): ImportNormalizer => ({
  detectedInstitutionId,
  matches: (upload) => matchesHeaderless(upload, signature),
  parseDate: signature.parseDate,
  normalize: (upload) => upload.records.map(mapHeaderlessRow),
});

export const tdImportNormalizer = createHeaderlessNormalizer('td', {
  looksLikeOwnDate: looksLikeImportMdyDate,
  looksLikeOtherDate: looksLikeImportIsoDate,
  parseDate: tryParseImportMdyDate,
  hasAccountMarker: (record) =>
    hasMonetaryAmount(optionalTrim(record.cells[4])),
});

export const cibcImportNormalizer = createHeaderlessNormalizer('cibc', {
  looksLikeOwnDate: looksLikeImportIsoDate,
  looksLikeOtherDate: looksLikeImportMdyDate,
  parseDate: tryParseImportIsoDate,
  hasAccountMarker: (record) =>
    /^\d{4}\*{8}\d{4}$/.test(optionalTrim(record.cells[4]) ?? ''),
});
