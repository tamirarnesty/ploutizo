import type { CsvRecord } from '../types';

export const optionalTrim = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

export const headersMatchInOrder = (
  headers: string[],
  required: readonly string[]
) =>
  required.every(
    (header, index) => normalizeHeader(headers[index] ?? '') === header
  );

export const buildRawData = (record: CsvRecord, headers: string[]) => {
  const rawData: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]?.trim() || `column_${index + 1}`;
    rawData[header] = record.cells[index] ?? '';
  }
  return rawData;
};

export const readNamedCell = (
  record: CsvRecord,
  headers: string[],
  header: string
) => {
  const index = headers.findIndex(
    (value) => normalizeHeader(value) === normalizeHeader(header)
  );
  return index === -1 ? null : optionalTrim(record.cells[index]);
};

/** Strip a leading sign so coerce can parse a positive absolute amount. */
export const toAbsoluteAmountSource = (
  value: string | null
): { sourceAmount: string | null; isNegative: boolean } => {
  if (!value) return { sourceAmount: null, isNegative: false };
  const isNegative = value.startsWith('-');
  const unsigned = value.replace(/^[+-]/, '').trim();
  return {
    sourceAmount: unsigned.length > 0 ? unsigned : null,
    isNegative,
  };
};
