import { parse } from 'csv-parse/sync';
import { CsvError } from 'csv-parse';
import { MAX_IMPORT_BYTES } from '@ploutizo/types';
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

export const isBlankRecord = (record: CsvRecord) =>
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
  return { records };
};
