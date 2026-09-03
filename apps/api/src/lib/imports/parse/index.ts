import {
  MAPPING_REQUIRED_SAMPLE_ROW_COUNT,
  MAX_IMPORT_ROWS,
} from '@ploutizo/types';
import type {
  ImportContentSelection,
  ImportUploadMappingRequired,
} from '@ploutizo/types';
import { coerceImportRows } from './coerce';
import { buildCustomMappingNormalizer } from './normalizers/custom-mapping';
import {
  findAutoDetectableProfiles,
  findMatchingProfiles,
  resolveSelectedProfile,
} from './normalizers/registry';
import { readCsvUpload } from './read';
import type { CsvUpload, ParseImportUploadResult } from './types';
import { DomainError } from '@/lib/errors';

export type {
  ParseImportUploadResult,
  ParsedImport,
  ParsedImportRow,
} from './types';

const toMappingRequired = (upload: CsvUpload): ImportUploadMappingRequired => {
  const candidates = findMatchingProfiles(upload).filter(
    (profile) => profile.profileId !== 'internal'
  );
  const dataRecords = upload.hasHeaderRow
    ? upload.records.slice(1)
    : upload.records;

  return {
    kind: 'mapping_required',
    candidateProfileIds: candidates.map((profile) => profile.profileId),
    columns: upload.headers,
    sampleRows: dataRecords
      .slice(0, MAPPING_REQUIRED_SAMPLE_ROW_COUNT)
      .map((record) => record.cells),
  };
};

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
    if (matches.length !== 1) return toMappingRequired(upload);
    resolvedSelection = { kind: 'profile', profileId: matches[0].profileId };
  }

  const normalizer =
    resolvedSelection.kind === 'profile'
      ? resolveSelectedProfile(upload, resolvedSelection.profileId)
      : buildCustomMappingNormalizer(upload, resolvedSelection.mapping);

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
    kind: 'parsed',
    contentProfileId:
      resolvedSelection.kind === 'profile' ? resolvedSelection.profileId : null,
    rowCount: rows.length,
    rows,
  };
};
