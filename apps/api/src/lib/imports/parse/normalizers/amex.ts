import { tryParseImportDayMonthYearDate } from '@ploutizo/utils/import-coercion';
import {
  buildRawData,
  createNamedCellReader,
  headersMatchInOrder,
  readSignedAmount,
} from './cells';
import type { ImportContentProfile, SourceImportRow } from '../types';

const REQUIRED_HEADERS = [
  'date',
  'date processed',
  'description',
  'card member',
  'account #',
  'amount',
] as const;

const matchesAmex = (upload: Parameters<ImportContentProfile['matches']>[0]) =>
  headersMatchInOrder(upload.headers, REQUIRED_HEADERS);

export const amexContentProfile: ImportContentProfile = {
  profileId: 'amex',
  matches: matchesAmex,
  acceptsSelection: matchesAmex,
  parseDate: tryParseImportDayMonthYearDate,
  normalize: (upload) => {
    const readCell = createNamedCellReader(upload.headers);
    return upload.records.slice(1).map((record): SourceImportRow => {
      const { sourceAmount, sourceType } = readSignedAmount(
        readCell(record, 'Amount')
      );

      return {
        rowNumber: record.rowNumber,
        rawData: buildRawData(record, upload.headers),
        externalId: readCell(record, 'Reference'),
        sourceDate: readCell(record, 'Date'),
        sourceAmount,
        sourceDescription: readCell(record, 'Description'),
        sourceType,
        hints: {
          csvCategoryName: null,
          csvAssigneeName: readCell(record, 'Card Member'),
          csvTagNames: [],
        },
      };
    });
  },
};
