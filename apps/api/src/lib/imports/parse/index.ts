import { MAX_IMPORT_ROWS } from '@ploutizo/types';
import type {
  ImportContentSelection,
  ImportUploadMappingRequired,
} from '@ploutizo/types';
import { coerceImportRows } from './coerce';
import { buildCustomMappingProfile } from './normalizers/custom-mapping';
import {
  findAutoDetectableProfiles,
  resolveSelectedProfile,
} from './normalizers/registry';
import { readCsvUpload } from './read';
import type { ParseImportUploadResult } from './types';
import { DomainError } from '@/lib/errors';

export type {
  ParseImportUploadResult,
  ParsedImport,
  ParsedImportRow,
} from './types';

const isMappingRequired = (
  result: ParseImportUploadResult
): result is ImportUploadMappingRequired => result.kind === 'mapping_required';

/**
 * Parse and normalize a CSV upload.
 * When `selection` is omitted, auto-detects a single matching profile or
 * returns `mapping_required` for the caller to prompt the member.
 */
export const parseImportUpload = (
  content: string,
  selection?: ImportContentSelection
): ParseImportUploadResult => {
  const upload = readCsvUpload(content);

  let resolvedSelection = selection;
  if (!resolvedSelection) {
    const matches = findAutoDetectableProfiles(upload);
    if (matches.length !== 1) return { kind: 'mapping_required' };
    resolvedSelection = { kind: 'profile', profileId: matches[0].profileId };
  }

  let profile;
  if (resolvedSelection.kind === 'profile') {
    profile = resolveSelectedProfile(upload, resolvedSelection.profileId);
  } else {
    profile = buildCustomMappingProfile(upload, resolvedSelection.mapping);
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
    kind: 'parsed',
    contentProfileId:
      resolvedSelection.kind === 'profile' ? resolvedSelection.profileId : null,
    rowCount: rows.length,
    rows,
  };
};

export const isParseImportMappingRequired = isMappingRequired;
