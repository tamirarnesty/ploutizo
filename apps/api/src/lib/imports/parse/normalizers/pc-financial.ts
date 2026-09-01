import type { ImportClassificationHint } from '@ploutizo/utils';
import {
  buildRawData,
  headersMatchInOrder,
  readNamedCell,
  toAbsoluteAmountSource,
} from './cells';
import type { CsvRecord, ImportNormalizer, SourceImportRow } from '../types';

const REQUIRED_HEADERS = [
  'description',
  'type',
  'card holder name',
  'date',
  'time',
  'amount',
] as const;

const PC_TYPE_BASELINES: Record<
  string,
  {
    sourceType: 'expense' | 'refund';
    classificationHint: ImportClassificationHint | null;
  }
> = {
  PURCHASE: { sourceType: 'expense', classificationHint: null },
  INTEREST: { sourceType: 'expense', classificationHint: null },
  PAYMENT: { sourceType: 'refund', classificationHint: 'bill_payment' },
};

const mapRow = (record: CsvRecord, headers: string[]): SourceImportRow => {
  const rawType = readNamedCell(record, headers, 'Type');
  const baseline = rawType
    ? PC_TYPE_BASELINES[rawType.toUpperCase()]
    : undefined;
  const { sourceAmount } = toAbsoluteAmountSource(
    readNamedCell(record, headers, 'Amount')
  );

  return {
    rowNumber: record.rowNumber,
    rawData: buildRawData(record, headers),
    externalId: null,
    sourceDate: readNamedCell(record, headers, 'Date'),
    sourceAmount,
    sourceDescription: readNamedCell(record, headers, 'Description'),
    sourceType: baseline?.sourceType ?? rawType,
    hints: {
      csvCategoryName: null,
      csvAssigneeName: null,
      csvTagNames: [],
    },
    classificationHint: baseline?.classificationHint ?? null,
  };
};

export const pcFinancialImportNormalizer: ImportNormalizer = {
  detectedInstitutionId: 'pc_financial',
  matches: (upload) => headersMatchInOrder(upload.headers, REQUIRED_HEADERS),
  normalize: (upload) =>
    upload.dataRecords.map((record) => mapRow(record, upload.headers)),
};
