import {
  looksLikeImportIsoDate,
  looksLikeImportMdyDate,
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

const looksLikeHeaderlessDateCell = (value: string | null) =>
  /\d/.test(value ?? '');

const matchesHeaderless = (
  upload: CsvUpload,
  looksLikeOther: (value: string | null) => boolean,
  parseOwn: (value: string | null) => string | null
) => {
  if (!isFiveColumnHeaderless(upload)) return false;
  if (!looksLikeHeaderlessDateCell(firstCell(upload.records[0]))) return false;

  const dates = upload.records.map((record) => firstCell(record));
  if (dates.some((date) => looksLikeOther(date))) return false;
  return dates.some((date) => parseOwn(date) != null);
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
    classificationHint: null,
  };
};

const createHeaderlessNormalizer = (
  detectedInstitutionId: FinancialInstitutionId,
  looksLikeOther: (value: string | null) => boolean,
  parseOwn: (value: string | null) => string | null
): ImportNormalizer => ({
  detectedInstitutionId,
  matches: (upload) => matchesHeaderless(upload, looksLikeOther, parseOwn),
  parseDate: parseOwn,
  normalize: (upload) => upload.records.map(mapHeaderlessRow),
});

export const tdImportNormalizer = createHeaderlessNormalizer(
  'td',
  looksLikeImportIsoDate,
  tryParseImportMdyDate
);

export const cibcImportNormalizer = createHeaderlessNormalizer(
  'cibc',
  looksLikeImportMdyDate,
  tryParseImportIsoDate
);
