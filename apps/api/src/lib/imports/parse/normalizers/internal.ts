import { tryParseImportIsoDate } from '@ploutizo/utils/import-coercion';
import { INTERNAL_IMPORT_REQUIRED_COLUMNS } from '@ploutizo/types';
import { parseImportTags } from '@ploutizo/utils';
import { buildRawData, normalizeHeader, optionalTrim } from './cells';
import type { CsvRecord, ImportNormalizer, SourceImportRow } from '../types';

type HeaderKey =
  | 'date'
  | 'amount'
  | 'description'
  | 'type'
  | 'externalId'
  | 'category'
  | 'assigneeHint'
  | 'refundLinkHint'
  | 'notes'
  | 'tags';

const REQUIRED_HEADERS: HeaderKey[] = [...INTERNAL_IMPORT_REQUIRED_COLUMNS];

const HEADER_ALIASES: Partial<Record<string, HeaderKey>> = {
  date: 'date',
  amount: 'amount',
  description: 'description',
  type: 'type',
  'external id': 'externalId',
  externalid: 'externalId',
  category: 'category',
  'assignee hint': 'assigneeHint',
  assigneehint: 'assigneeHint',
  assignee: 'assigneeHint',
  'refund link hint': 'refundLinkHint',
  'refund link hints': 'refundLinkHint',
  refundlinkhint: 'refundLinkHint',
  'refund hint': 'refundLinkHint',
  notes: 'notes',
  note: 'notes',
  tags: 'tags',
};

const buildHeaderMap = (headers: string[]) => {
  const map = new Map<HeaderKey, number>();
  headers.forEach((header, index) => {
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    if (alias && !map.has(alias)) {
      map.set(alias, index);
    }
  });
  return map;
};

const readCell = (
  record: CsvRecord,
  headerMap: Map<HeaderKey, number>,
  key: HeaderKey
) => {
  const index = headerMap.get(key);
  return index === undefined ? null : optionalTrim(record.cells[index]);
};

const hasRequiredHeaders = (headerMap: Map<HeaderKey, number>) =>
  REQUIRED_HEADERS.every((header) => headerMap.has(header));

const mapRow = (
  record: CsvRecord,
  headers: string[],
  headerMap: Map<HeaderKey, number>
): SourceImportRow => ({
  rowNumber: record.rowNumber,
  rawData: buildRawData(record, headers),
  externalId: readCell(record, headerMap, 'externalId'),
  sourceDate: readCell(record, headerMap, 'date'),
  sourceAmount: readCell(record, headerMap, 'amount'),
  sourceDescription: readCell(record, headerMap, 'description'),
  sourceType: readCell(record, headerMap, 'type'),
  hints: {
    csvCategoryName: readCell(record, headerMap, 'category'),
    csvAssigneeName: readCell(record, headerMap, 'assigneeHint'),
    csvTagNames: parseImportTags(readCell(record, headerMap, 'tags') ?? ''),
  },
  reviewRefundLinkHint: readCell(record, headerMap, 'refundLinkHint'),
  reviewNotes: readCell(record, headerMap, 'notes'),
});

export const internalImportNormalizer: ImportNormalizer = {
  detectedInstitutionId: null,
  matches: (upload) => hasRequiredHeaders(buildHeaderMap(upload.headers)),
  parseDate: tryParseImportIsoDate,
  normalize: (upload) => {
    const headerMap = buildHeaderMap(upload.headers);
    return upload.dataRecords.map((record) =>
      mapRow(record, upload.headers, headerMap)
    );
  },
};
