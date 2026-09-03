import {
  isImportAmountToken,
  looksLikeImportIsoDate,
  looksLikeImportMdyDate,
  tryParseImportAmountToCents,
  tryParseImportIsoDate,
  tryParseImportMdyDate,
} from '@ploutizo/utils/import-coercion';
import {
  buildRawData,
  optionalTrim,
  readDebitCreditAmount,
  toAbsoluteAmountSource,
} from './cells';
import type {
  CsvRecord,
  CsvUpload,
  ImportContentProfile,
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
  hasColumnFiveMarker: (record: CsvRecord) => boolean;
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
        signature.hasColumnFiveMarker(record)
      );
    }) &&
    upload.records.some(
      (record) =>
        signature.parseDate(firstCell(record)) != null &&
        hasExclusiveDebitOrCredit(record)
    )
  );
};

const acceptsHeaderlessSelection = (
  upload: CsvUpload,
  signature: HeaderlessFormatSignature
) => {
  if (!isFiveColumnHeaderless(upload)) return false;

  return upload.records.some((record) => {
    const date = firstCell(record);
    return (
      signature.looksLikeOwnDate(date) && !signature.looksLikeOtherDate(date)
    );
  });
};

const mapHeaderlessRow = (record: CsvRecord): SourceImportRow => {
  const { sourceAmount, sourceType } = readDebitCreditAmount(
    optionalTrim(record.cells[2]),
    optionalTrim(record.cells[3])
  );

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
    sourceType,
  };
};

const createHeaderlessProfile = (
  profileId: ImportContentProfile['profileId'],
  signature: HeaderlessFormatSignature
): ImportContentProfile => ({
  profileId,
  matches: (upload) => matchesHeaderless(upload, signature),
  acceptsSelection: (upload) => acceptsHeaderlessSelection(upload, signature),
  parseDate: signature.parseDate,
  normalize: (upload) => upload.records.map(mapHeaderlessRow),
});

/**
 * Generic positional profile: `MM/DD/YYYY`, description, debit, credit,
 * running balance (monetary amount).
 *
 * Historically matched TD credit-card exports. This profile carries no
 * institution identity — the same layout may appear from any issuer.
 */
export const mdyDebitCreditBalanceProfile = createHeaderlessProfile(
  'mdy_debit_credit_balance',
  {
    looksLikeOwnDate: looksLikeImportMdyDate,
    looksLikeOtherDate: looksLikeImportIsoDate,
    parseDate: tryParseImportMdyDate,
    hasColumnFiveMarker: (record) =>
      hasMonetaryAmount(optionalTrim(record.cells[4])),
  }
);

/**
 * Generic positional profile: ISO date, description, debit, credit,
 * masked card number (`NNNN********NNNN`).
 *
 * Historically matched CIBC credit-card exports. This profile carries no
 * institution identity.
 */
export const isoDebitCreditMaskedCardProfile = createHeaderlessProfile(
  'iso_debit_credit_masked_card',
  {
    looksLikeOwnDate: looksLikeImportIsoDate,
    looksLikeOtherDate: looksLikeImportMdyDate,
    parseDate: tryParseImportIsoDate,
    hasColumnFiveMarker: (record) =>
      /^\d{4}\*{8}\d{4}$/.test(optionalTrim(record.cells[4]) ?? ''),
  }
);
