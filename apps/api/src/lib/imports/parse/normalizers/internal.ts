import {
  INTERNAL_IMPORT_FORMAT,
  INTERNAL_IMPORT_REQUIRED_COLUMNS,
  MAX_IMPORT_ROWS,
} from '@ploutizo/types';
import { parseImportTags } from '@ploutizo/utils';
import { isBlankRecord } from '../read';
import type {
  CsvRecord,
  CsvUpload,
  ImportNormalizer,
  SourceImportRow,
} from '../types';
import { DomainError } from '@/lib/errors';

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

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const optionalTrim = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
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

const buildRawData = (record: CsvRecord, headers: string[]) => {
  const rawData: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]?.trim() || `column_${index + 1}`;
    rawData[header] = record.cells[index] ?? '';
  }
  return rawData;
};

const getHeaderContext = (upload: CsvUpload) => {
  const headerIndex = upload.records.findIndex(
    (record) => !isBlankRecord(record)
  );
  if (headerIndex === -1) return null;

  const headerRecord = upload.records[headerIndex];
  const headers = headerRecord.cells.map((header) => header.trim());
  const headerMap = buildHeaderMap(headers);
  const dataRecords = upload.records
    .slice(headerIndex + 1)
    .filter((record) => !isBlankRecord(record));

  return { headers, headerMap, dataRecords };
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
  csvCategoryName: readCell(record, headerMap, 'category'),
  csvAssigneeName: readCell(record, headerMap, 'assigneeHint'),
  csvTagNames: parseImportTags(readCell(record, headerMap, 'tags') ?? ''),
  reviewRefundLinkHint: readCell(record, headerMap, 'refundLinkHint'),
  reviewNotes: readCell(record, headerMap, 'notes'),
});

export const internalImportNormalizer: ImportNormalizer = {
  format: INTERNAL_IMPORT_FORMAT,
  matches: (upload) => {
    const context = getHeaderContext(upload);
    if (!context) return false;
    return hasRequiredHeaders(context.headerMap);
  },
  normalize: (upload) => {
    const context = getHeaderContext(upload);
    if (!context) {
      throw new DomainError(400, 'The CSV file is empty.', 'IMPORT_FILE_EMPTY');
    }

    const { headers, headerMap, dataRecords } = context;
    if (!hasRequiredHeaders(headerMap)) {
      throw new DomainError(
        400,
        'This file is not a Ploutizo normalized CSV. Required columns are date, amount, description, and type.',
        'IMPORT_FILE_UNRECOGNIZED'
      );
    }

    if (dataRecords.length === 0) {
      throw new DomainError(
        400,
        'The CSV file has no data rows.',
        'IMPORT_FILE_EMPTY'
      );
    }

    if (dataRecords.length > MAX_IMPORT_ROWS) {
      throw new DomainError(
        413,
        'The CSV file has too many rows. Upload 1,000 rows or fewer.',
        'IMPORT_FILE_TOO_LARGE'
      );
    }

    return dataRecords.map((record) => mapRow(record, headers, headerMap));
  },
};
