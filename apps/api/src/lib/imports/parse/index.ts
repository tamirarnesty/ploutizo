import { MAX_IMPORT_ROWS } from '@ploutizo/types';
import type {
  ImportContentSelection,
  InspectImportResult,
} from '@ploutizo/types';
import { coerceImportRows } from './coerce';
import { buildCustomMappingProfile } from './normalizers/custom-mapping';
import {
  findMatchingProfiles,
  resolveSelectedProfile,
  suggestCompatibleProfileIds,
} from './normalizers/registry';
import { readCsvUpload } from './read';
import type { ParsedImport } from './types';
import { DomainError } from '@/lib/errors';

export type { ParsedImport, ParsedImportRow } from './types';
export type { InspectImportResult };

const PREVIEW_ROW_COUNT = 5;

/**
 * Inspect a CSV without persisting anything.
 * Returns either a recognized content profile with a preview, or a
 * `mapping_required` result with compatible profile suggestions.
 */
export const inspectImportUpload = (content: string): InspectImportResult => {
  const upload = readCsvUpload(content);
  const matches = findMatchingProfiles(upload);

  if (matches.length === 1) {
    const profile = matches[0];
    const sourceRows = profile.normalize(upload);
    const previewRows = sourceRows.slice(0, PREVIEW_ROW_COUNT);
    return {
      kind: 'recognized',
      profileId: profile.profileId,
      preview: {
        rowCount: sourceRows.length,
        sampleParsedRows: previewRows.map((row) => ({
          sourceDate: row.sourceDate,
          sourceAmount: row.sourceAmount,
          sourceDescription: row.sourceDescription,
          sourceType: row.sourceType,
        })),
      },
    };
  }

  // Zero or multiple matches → mapping required
  return {
    kind: 'mapping_required',
    headers: upload.headers.length > 0 ? upload.headers : null,
    sampleRows: upload.records
      .slice(0, PREVIEW_ROW_COUNT)
      .map((r) => ({ cells: r.cells, rowNumber: r.rowNumber })),
    suggestedProfileIds: suggestCompatibleProfileIds(upload),
  };
};

/**
 * Parse and normalize a CSV given a member-confirmed content selection.
 * Validates that the selection is compatible with the file before normalizing.
 */
export const parseImportUpload = (
  content: string,
  selection: ImportContentSelection
): ParsedImport => {
  const upload = readCsvUpload(content);

  let profile;
  if (selection.kind === 'profile') {
    profile = resolveSelectedProfile(upload, selection.profileId);
  } else {
    profile = buildCustomMappingProfile(upload, selection.mapping);
  }

  const sourceRows = profile.normalize(upload);
  if (sourceRows.length > MAX_IMPORT_ROWS) {
    throw new DomainError(
      413,
      'The CSV file has too many rows. Upload 1,000 rows or fewer.',
      'IMPORT_FILE_TOO_LARGE'
    );
  }
  const rows = coerceImportRows(sourceRows, profile.parseDate);

  return {
    contentProfileId: selection.kind === 'profile' ? selection.profileId : null,
    rowCount: rows.length,
    rows,
  };
};
