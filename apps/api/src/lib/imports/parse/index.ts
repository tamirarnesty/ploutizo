import { MAX_IMPORT_ROWS } from '@ploutizo/types';
import { coerceImportRows } from './coerce';
import { detectImportNormalizer } from './normalizers/registry';
import { readCsvUpload } from './read';
import type { ParseImportHints, ParsedImport } from './types';
import { DomainError } from '@/lib/errors';

export type { ParseImportHints, ParsedImport, ParsedImportRow } from './types';

export const parseImportUpload = (
  content: string,
  _hints?: ParseImportHints
): ParsedImport => {
  const upload = readCsvUpload(content);
  const normalizer = detectImportNormalizer(upload);
  const sourceRows = normalizer.normalize(upload);
  if (sourceRows.length > MAX_IMPORT_ROWS) {
    throw new DomainError(
      413,
      'The CSV file has too many rows. Upload 1,000 rows or fewer.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }
  const rows = coerceImportRows(sourceRows, normalizer.parseDate);

  return {
    detectedInstitutionId: normalizer.detectedInstitutionId,
    rowCount: rows.length,
    rows,
  };
};
