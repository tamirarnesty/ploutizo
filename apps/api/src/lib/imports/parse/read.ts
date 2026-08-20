import { MAX_IMPORT_BYTES } from '@ploutizo/types';
import type { CsvRecord, CsvUpload } from './types';
import { DomainError } from '@/lib/errors';

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

export const isBlankRecord = (record: CsvRecord) =>
  record.cells.every((cell) => cell.trim().length === 0);

export const readCsvUpload = (content: string): CsvUpload => {
  const strippedContent = content.replace(/^\uFEFF/, '');
  if (Buffer.byteLength(strippedContent, 'utf8') > MAX_IMPORT_BYTES) {
    throw new DomainError(
      413,
      'The CSV file is too large. Upload a file smaller than 512 KB.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }

  const records = parseCsvRecords(strippedContent);
  return { records };
};
