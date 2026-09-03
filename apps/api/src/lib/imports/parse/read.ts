import { parse } from 'csv-parse/sync';
import { CsvError } from 'csv-parse';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '@ploutizo/types';
import {
  isImportAmountToken,
  looksLikeImportDayMonthYearDate,
  looksLikeImportIsoDate,
  looksLikeImportMdyDate,
} from '@ploutizo/utils/import-coercion';
import type { CsvRecord, CsvUpload } from './types';
import { DomainError } from '@/lib/errors';

const parseCsvRecords = (content: string): CsvRecord[] => {
  try {
    const rows = parse(content, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: false,
    });

    return rows.map((cells, index) => ({
      cells,
      rowNumber: index + 1,
    }));
  } catch (error) {
    if (error instanceof CsvError) {
      throw new DomainError(
        400,
        'The CSV file could not be read.',
        'IMPORT_FILE_CORRUPT'
      );
    }
    throw error;
  }
};

const isBlankRecord = (record: CsvRecord) =>
  record.cells.every((cell) => cell.trim().length === 0);

const looksLikeValueCell = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const unsigned = trimmed.replace(/^[+-]/, '').trim();
  return (
    looksLikeImportIsoDate(trimmed) ||
    looksLikeImportMdyDate(trimmed) ||
    looksLikeImportDayMonthYearDate(trimmed) ||
    isImportAmountToken(unsigned)
  );
};

const rowLooksLikeValues = (cells: string[]): boolean => {
  const nonEmpty = cells.map((cell) => cell.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return false;
  const valueCount = nonEmpty.filter(looksLikeValueCell).length;
  return (
    valueCount >= Math.ceil(nonEmpty.length / 2) ||
    looksLikeValueCell(nonEmpty[0])
  );
};

const detectHeaderRow = (records: CsvRecord[]): boolean =>
  !rowLooksLikeValues(records[0].cells);

const positionalColumnLabel = (index: number) => `Column ${index + 1}`;

const columnKeys = (records: CsvRecord[], hasHeaderRow: boolean): string[] => {
  if (hasHeaderRow) {
    return records[0].cells.map((cell) => cell.trim());
  }

  const width = records.reduce(
    (max, record) => Math.max(max, record.cells.length),
    0
  );
  return Array.from({ length: width }, (_, index) =>
    positionalColumnLabel(index)
  );
};

export const readCsvUpload = (content: string): CsvUpload => {
  if (Buffer.byteLength(content, 'utf8') > MAX_IMPORT_BYTES) {
    throw new DomainError(
      413,
      'The CSV file is too large. Upload a file smaller than 512 KB.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  const records = parseCsvRecords(content);
  const headerIndex = records.findIndex((record) => !isBlankRecord(record));
  if (headerIndex === -1) {
    throw new DomainError(400, 'The CSV file is empty.', 'IMPORT_FILE_EMPTY');
  }

  const recordsFromContent = records
    .slice(headerIndex)
    .filter((record) => !isBlankRecord(record));
  const hasHeaderRow = detectHeaderRow(recordsFromContent);
  const dataRowCount = hasHeaderRow
    ? recordsFromContent.length - 1
    : recordsFromContent.length;

  if (dataRowCount > MAX_IMPORT_ROWS) {
    throw new DomainError(
      413,
      'The CSV file has too many rows. Upload 1,000 rows or fewer.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  return {
    headers: columnKeys(recordsFromContent, hasHeaderRow),
    hasHeaderRow,
    records: recordsFromContent,
  };
};
