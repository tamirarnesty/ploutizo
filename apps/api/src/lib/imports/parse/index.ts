import { coerceImportRows } from './coerce';
import { detectImportNormalizer } from './normalizers/registry';
import { readCsvUpload } from './read';
import type { ParseImportHints, ParsedImport } from './types';

export type { ParseImportHints, ParsedImport, ParsedImportRow } from './types';

export const parseImportUpload = (
  content: string,
  _hints?: ParseImportHints
): ParsedImport => {
  const upload = readCsvUpload(content);
  const normalizer = detectImportNormalizer(upload);
  const sourceRows = normalizer.normalize(upload);
  const rows = coerceImportRows(sourceRows);

  return {
    format: normalizer.format,
    rowCount: rows.length,
    rows,
  };
};
