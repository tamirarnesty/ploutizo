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

export const createNamedCellReader = (headers: string[]) => {
  const indices = new Map(
    headers.map((header, index) => [normalizeHeader(header), index])
  );

  return (record: CsvRecord, header: string) => {
    const index = indices.get(normalizeHeader(header));
    return index === undefined ? null : optionalTrim(record.cells[index]);
  };
};

export const buildRawData = (record: CsvRecord, headers: string[]) => {
  const rawData: Record<string, string> = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]?.trim() || `column_${index + 1}`;
    rawData[header] = record.cells[index] ?? '';
  }
  return rawData;
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
