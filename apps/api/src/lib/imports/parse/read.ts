import { parse } from 'csv-parse/sync';
import { CsvError } from 'csv-parse';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '@ploutizo/types';
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

  const headers = records[headerIndex].cells.map((header) => header.trim());
  const recordsFromContent = records
    .slice(headerIndex)
    .filter((record) => !isBlankRecord(record));

  if (recordsFromContent.length - 1 > MAX_IMPORT_ROWS) {
    throw new DomainError(
      413,
      'The CSV file has too many rows. Upload 1,000 rows or fewer.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  return { headers, records: recordsFromContent };
};
