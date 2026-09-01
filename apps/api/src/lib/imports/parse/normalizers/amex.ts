import {
  buildRawData,
  headersMatchInOrder,
  readNamedCell,
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
  normalize: (upload) =>
    upload.dataRecords.map((record): SourceImportRow => {
      const amount = readNamedCell(record, upload.headers, 'Amount');
      const { sourceAmount, isNegative } = toAbsoluteAmountSource(amount);

      return {
        rowNumber: record.rowNumber,
        rawData: buildRawData(record, upload.headers),
        externalId: readNamedCell(record, upload.headers, 'Reference'),
        sourceDate: readNamedCell(record, upload.headers, 'Date'),
        sourceAmount,
        sourceDescription: readNamedCell(record, upload.headers, 'Description'),
        sourceType: sourceAmount ? (isNegative ? 'refund' : 'expense') : null,
        hints: {
          csvCategoryName: null,
          csvAssigneeName: readNamedCell(record, upload.headers, 'Card Member'),
          csvTagNames: [],
        },
        classificationHint: null,
      };
    }),
};
