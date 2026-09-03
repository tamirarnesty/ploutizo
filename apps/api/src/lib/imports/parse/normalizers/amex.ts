import { tryParseImportDayMonthYearDate } from '@ploutizo/utils/import-coercion';
import {
  buildRawData,
  createNamedCellReader,
  headersMatchInOrder,
  toAbsoluteAmountSource,
} from './cells';
import type { ImportNormalizer, SourceImportRow } from '../types';

const REQUIRED_HEADERS = [
  'date',
  'date processed',
  'description',
  'card member',
  'account #',
  'amount',
] as const;

export const amexImportNormalizer: ImportNormalizer = {
  detectedInstitutionId: 'amex',
  matches: (upload) => headersMatchInOrder(upload.headers, REQUIRED_HEADERS),
  parseDate: tryParseImportDayMonthYearDate,
  normalize: (upload) => {
    const readCell = createNamedCellReader(upload.headers);
    return upload.records.slice(1).map((record): SourceImportRow => {
      const amount = readCell(record, 'Amount');
      const { sourceAmount, isNegative } = toAbsoluteAmountSource(amount);

      return {
        rowNumber: record.rowNumber,
        rawData: buildRawData(record, upload.headers),
        externalId: readCell(record, 'Reference'),
        sourceDate: readCell(record, 'Date'),
        sourceAmount,
        sourceDescription: readCell(record, 'Description'),
        sourceType: sourceAmount ? (isNegative ? 'refund' : 'expense') : null,
        hints: {
          csvCategoryName: null,
          csvAssigneeName: readCell(record, 'Card Member'),
          csvTagNames: [],
        },
      };
    });
  },
};
