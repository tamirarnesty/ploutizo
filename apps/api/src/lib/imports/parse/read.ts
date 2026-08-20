import { parse } from 'csv-parse/sync';
import { CsvError } from 'csv-parse';
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from '@ploutizo/types';
import type { CsvRecord, CsvUpload } from './types';
import { DomainError } from '@/lib/errors';

const CSV_PARSE_OPTIONS = {
  bom: true,
  relax_column_count: true,
  skip_empty_lines: false,
} as const;

const corruptFileError = () =>
  new DomainError(
    400,
    'The CSV file could not be read.',
    'IMPORT_FILE_CORRUPT'
  );

const isRecordDelimiter = (char: string) => char === '\n' || char === '\r';

/**
 * RFC quoted fields may only be followed by a delimiter, record break, or EOF.
 * Used when retrying INVALID_OPENING_QUOTE with relax_quotes, which would
 * otherwise also accept trailing junk after a closed quote (`"Coffee"x`).
 */
const hasJunkAfterClosedQuote = (content: string): boolean => {
  let inQuotes = false;
  let atFieldStart = true;
  const start = content.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (let i = start; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes) {
        if (next === '"') {
          i += 1;
          atFieldStart = false;
          continue;
        }
        inQuotes = false;
        if (next && next !== ',' && !isRecordDelimiter(next)) {
          return true;
        }
        continue;
      }
      if (atFieldStart) {
        inQuotes = true;
        atFieldStart = false;
        continue;
      }
      continue;
    }

    if (!inQuotes && (char === ',' || isRecordDelimiter(char))) {
      atFieldStart = true;
      if (char === '\r' && next === '\n') i += 1;
      continue;
    }

    atFieldStart = false;
  }

  return false;
};

const toCsvRecords = (rows: string[][]): CsvRecord[] =>
  rows.map((cells, index) => ({
    cells,
    rowNumber: index + 1,
  }));

const parseRows = (content: string, relaxQuotes: boolean): string[][] =>
  parse(content, {
    ...CSV_PARSE_OPTIONS,
    relax_quotes: relaxQuotes,
  });

const parseCsvRecords = (content: string): CsvRecord[] => {
  try {
    return toCsvRecords(parseRows(content, false));
  } catch (error) {
    if (!(error instanceof CsvError)) throw error;
    if (error.code === 'INVALID_OPENING_QUOTE') {
      if (hasJunkAfterClosedQuote(content)) {
        throw corruptFileError();
      }
      try {
        return toCsvRecords(parseRows(content, true));
      } catch (relaxedError) {
        if (relaxedError instanceof CsvError) throw corruptFileError();
        throw relaxedError;
      }
    }
    throw corruptFileError();
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

  if (dataRecords.length > MAX_IMPORT_ROWS) {
    throw new DomainError(
      413,
      'The CSV file has too many rows. Upload 1,000 rows or fewer.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  return { headers, dataRecords };
};
