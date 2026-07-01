import {
  IMPORT_TRANSACTION_TYPE_VALUES,
  MAX_NORMALIZED_IMPORT_BYTES,
  MAX_NORMALIZED_IMPORT_ROWS,
  NORMALIZED_IMPORT_REQUIRED_COLUMNS,
  NORMALIZED_IMPORT_SOURCE,
} from '@ploutizo/types';
import { parseImportTags } from '@ploutizo/utils';
import type { ImportDraftRow, ImportTransactionType } from '@ploutizo/types';
import { computeImportRowStatus } from './rowStatus';
import { DomainError } from '@/lib/errors';

type CsvRecord = {
  cells: string[];
  rowNumber: number;
};

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

export type ParsedImportRow = Pick<
  ImportDraftRow,
  | 'rowNumber'
  | 'status'
  | 'invalidReason'
  | 'rawData'
  | 'externalId'
  | 'sourceDate'
  | 'sourceAmount'
  | 'sourceDescription'
  | 'sourceType'
  | 'parsedDate'
  | 'parsedAmount'
  | 'parsedType'
  | 'parsedDescription'
  | 'reviewDate'
  | 'reviewAmount'
  | 'reviewType'
  | 'reviewDescription'
  | 'reviewCategoryName'
  | 'reviewAssigneeHint'
  | 'reviewAssigneeMemberIds'
  | 'reviewRefundLinkHint'
  | 'reviewNotes'
  | 'reviewTags'
>;

export interface ParsedNormalizedImport {
  source: typeof NORMALIZED_IMPORT_SOURCE;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  rows: ParsedImportRow[];
}

const REQUIRED_HEADERS: HeaderKey[] = [...NORMALIZED_IMPORT_REQUIRED_COLUMNS];

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

const IMPORT_TRANSACTION_TYPES = new Set<string>(
  IMPORT_TRANSACTION_TYPE_VALUES
);

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const optionalTrim = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const parseCsvRecords = (content: string): CsvRecord[] => {
  const records: CsvRecord[] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;
  let rowNumber = 1;

  const pushValue = () => {
    row.push(value);
    value = '';
  };

  const pushRow = () => {
    pushValue();
    records.push({ cells: row, rowNumber });
    row = [];
    rowNumber += 1;
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else if (inQuotes) {
        inQuotes = false;
        if (next && next !== ',' && next !== '\n' && next !== '\r') {
          throw new DomainError(
            400,
            'The CSV file could not be read because a quoted field contains trailing characters.',
            'IMPORT_FILE_CORRUPT'
          );
        }
      } else if (value.length === 0) {
        inQuotes = true;
      } else {
        value += char;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      pushValue();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      pushRow();
      continue;
    }

    value += char;
  }

  if (inQuotes) {
    throw new DomainError(
      400,
      'The CSV file could not be read because a quoted field is not closed.',
      'IMPORT_FILE_CORRUPT'
    );
  }

  if (value.length > 0 || row.length > 0) {
    pushRow();
  }

  return records;
};

const isBlankRecord = (record: CsvRecord) =>
  record.cells.every((cell) => cell.trim().length === 0);

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

const parseIsoDate = (value: string | null): string | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
};

const parseAmountCents = (value: string | null): number | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!/^\$?\s*(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/.test(raw)) return null;
  const normalized = raw.replace(/^\$\s*/, '').replace(/,/g, '');
  const [dollars, cents = ''] = normalized.split('.');
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
};

const parseType = (value: string | null): ImportTransactionType | null => {
  const normalized = value?.trim().toLowerCase() ?? '';
  return IMPORT_TRANSACTION_TYPES.has(normalized)
    ? (normalized as ImportTransactionType)
    : null;
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

const parseRow = (
  record: CsvRecord,
  headers: string[],
  headerMap: Map<HeaderKey, number>
): ParsedImportRow => {
  const sourceDate = readCell(record, headerMap, 'date');
  const sourceAmount = readCell(record, headerMap, 'amount');
  const sourceDescription = readCell(record, headerMap, 'description');
  const sourceType = readCell(record, headerMap, 'type');
  const externalId = readCell(record, headerMap, 'externalId');
  const reviewCategoryName = readCell(record, headerMap, 'category');
  const reviewAssigneeHint = readCell(record, headerMap, 'assigneeHint');
  const reviewRefundLinkHint = readCell(record, headerMap, 'refundLinkHint');
  const reviewNotes = readCell(record, headerMap, 'notes');
  const reviewTags = parseImportTags(readCell(record, headerMap, 'tags') ?? '');

  const parsedDate = parseIsoDate(sourceDate);
  const parsedAmount = parseAmountCents(sourceAmount);
  const parsedType = parseType(sourceType);
  const parsedDescription = sourceDescription;
  const invalidReasons: string[] = [];

  if (!parsedDate)
    invalidReasons.push('Date must be a valid YYYY-MM-DD value.');
  if (!parsedAmount) invalidReasons.push('Amount must be a positive number.');
  if (!parsedDescription) invalidReasons.push('Description is required.');
  if (!parsedType) {
    invalidReasons.push('Type must be expense, refund, or settlement.');
  }

  const isInvalid = invalidReasons.length > 0;
  const status = isInvalid
    ? ('invalid' as const)
    : computeImportRowStatus({
        status: 'ready',
        reviewType: parsedType,
        parsedType,
        reviewCategoryName,
        reviewAssigneeMemberIds: [],
      });

  return {
    rowNumber: record.rowNumber,
    status,
    invalidReason: invalidReasons.length > 0 ? invalidReasons.join(' ') : null,
    rawData: buildRawData(record, headers),
    externalId,
    sourceDate,
    sourceAmount,
    sourceDescription,
    sourceType,
    parsedDate,
    parsedAmount,
    parsedType,
    parsedDescription,
    reviewDate: parsedDate,
    reviewAmount: parsedAmount,
    reviewType: parsedType,
    reviewDescription: parsedDescription,
    reviewCategoryName,
    reviewAssigneeHint,
    reviewAssigneeMemberIds: [],
    reviewRefundLinkHint,
    reviewNotes,
    reviewTags,
  };
};

export const parsePloutizoNormalizedCsv = (
  content: string
): ParsedNormalizedImport => {
  const strippedContent = content.replace(/^\uFEFF/, '');
  if (
    Buffer.byteLength(strippedContent, 'utf8') > MAX_NORMALIZED_IMPORT_BYTES
  ) {
    throw new DomainError(
      413,
      'The CSV file is too large. Upload a file smaller than 512 KB.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  const records = parseCsvRecords(strippedContent);
  const headerIndex = records.findIndex((record) => !isBlankRecord(record));
  if (headerIndex === -1) {
    throw new DomainError(400, 'The CSV file is empty.', 'IMPORT_FILE_EMPTY');
  }

  const headerRecord = records[headerIndex];
  const headers = headerRecord.cells.map((header) => header.trim());
  const headerMap = buildHeaderMap(headers);
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerMap.has(header)
  );
  if (missingHeaders.length > 0) {
    throw new DomainError(
      400,
      'This file is not a Ploutizo normalized CSV. Required columns are date, amount, description, and type.',
      'IMPORT_FILE_UNRECOGNIZED'
    );
  }

  const dataRecords = records
    .slice(headerIndex + 1)
    .filter((record) => !isBlankRecord(record));
  if (dataRecords.length === 0) {
    throw new DomainError(
      400,
      'The CSV file has no data rows.',
      'IMPORT_FILE_EMPTY'
    );
  }

  if (dataRecords.length > MAX_NORMALIZED_IMPORT_ROWS) {
    throw new DomainError(
      413,
      'The CSV file has too many rows. Upload 1,000 rows or fewer.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  const rows = dataRecords.map((record) =>
    parseRow(record, headers, headerMap)
  );
  const validRowCount = rows.filter((row) => row.status !== 'invalid').length;
  const invalidRowCount = rows.length - validRowCount;

  if (validRowCount === 0) {
    throw new DomainError(
      400,
      'No importable rows were found in the CSV file.',
      'IMPORT_FILE_EMPTY'
    );
  }

  return {
    source: NORMALIZED_IMPORT_SOURCE,
    rowCount: rows.length,
    validRowCount,
    invalidRowCount,
    rows,
  };
};

export { computeImportRowStatus } from './rowStatus';
