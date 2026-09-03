import { tryParseImportMdyDate } from '@ploutizo/utils/import-coercion';
import type { ImportClassificationHint } from '@ploutizo/utils';
import {
  buildRawData,
  createNamedCellReader,
  headersMatchInOrder,
  toAbsoluteAmountSource,
} from './cells';
import type {
  CsvRecord,
  ImportContentProfile,
  SourceImportRow,
} from '../types';

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
    classificationHint?: ImportClassificationHint;
  }
> = {
  PURCHASE: { sourceType: 'expense' },
  INTEREST: { sourceType: 'expense' },
  PAYMENT: { sourceType: 'refund', classificationHint: 'bill_payment' },
};

const mapRow = (
  record: CsvRecord,
  headers: string[],
  readCell: ReturnType<typeof createNamedCellReader>
): SourceImportRow => {
  const rawType = readCell(record, 'Type');
  const baseline = rawType
    ? PC_TYPE_BASELINES[rawType.toUpperCase()]
    : undefined;
  const { sourceAmount } = toAbsoluteAmountSource(readCell(record, 'Amount'));

  return {
    rowNumber: record.rowNumber,
    rawData: buildRawData(record, headers),
    externalId: null,
    sourceDate: readCell(record, 'Date'),
    sourceAmount,
    sourceDescription: readCell(record, 'Description'),
    sourceType: baseline?.sourceType ?? rawType,
    hints: {
      csvCategoryName: null,
      csvAssigneeName: null,
      csvTagNames: [],
    },
    classificationHint: baseline?.classificationHint,
  };
};

const matchesPcFinancial = (
  upload: Parameters<ImportContentProfile['matches']>[0]
) => headersMatchInOrder(upload.headers, REQUIRED_HEADERS);

export const pcFinancialContentProfile: ImportContentProfile = {
  profileId: 'pc_financial',
  matches: matchesPcFinancial,
  acceptsSelection: matchesPcFinancial,
  parseDate: tryParseImportMdyDate,
  normalize: (upload) => {
    const readCell = createNamedCellReader(upload.headers);
    return upload.records
      .slice(1)
      .map((record) => mapRow(record, upload.headers, readCell));
  },
};
