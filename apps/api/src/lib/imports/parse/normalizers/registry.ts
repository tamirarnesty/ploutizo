import type { ImportContentProfileId } from '@ploutizo/types';
import { amexContentProfile } from './amex';
import {
  isoDebitCreditMaskedCardProfile,
  mdyDebitCreditBalanceProfile,
} from './headerless';
import { internalContentProfile } from './internal';
import { pcFinancialContentProfile } from './pc-financial';
import type { CsvUpload, ImportContentProfile } from '../types';
import { DomainError } from '@/lib/errors';

/**
 * Named content profiles checked before the internal fallback.
 * A file matching any of these does not trigger the internal fallback check.
 */
const NAMED_PROFILES: ImportContentProfile[] = [
  amexContentProfile,
  pcFinancialContentProfile,
  mdyDebitCreditBalanceProfile,
  isoDebitCreditMaskedCardProfile,
];

/**
 * Inspect a parsed CSV upload and return the matching profile(s).
 * The internal profile is only returned if no named profile matches.
 * Does not throw — the caller decides how to handle zero or multiple matches.
 */
export const findMatchingProfiles = (
  upload: CsvUpload
): ImportContentProfile[] => {
  const namedMatches = NAMED_PROFILES.filter((profile) =>
    profile.matches(upload)
  );
  if (namedMatches.length > 0) return namedMatches;
  if (internalContentProfile.matches(upload)) return [internalContentProfile];
  return [];
};

/**
 * Return the single recognized profile for an upload, or throw a domain error
 * if the upload is ambiguous or unrecognized.
 *
 * Used by `parseImportUpload` when a profile selection has been confirmed.
 */
export const detectContentProfile = (
  upload: CsvUpload
): ImportContentProfile => {
  const matches = findMatchingProfiles(upload);

  if (matches.length > 1) {
    throw new DomainError(
      400,
      'This file matches more than one supported format.',
      'IMPORT_FILE_AMBIGUOUS'
    );
  }

  if (matches.length === 1) {
    return matches[0];
  }

  throw new DomainError(
    400,
    'This file is not a recognized import format.',
    'IMPORT_FILE_UNRECOGNIZED'
  );
};

/** All profiles in order (named first, then internal). */
const ALL_PROFILES = [...NAMED_PROFILES, internalContentProfile];

/**
 * Return the profile for a member-confirmed profile ID.
 * Throws if the profile does not match the actual upload.
 */
export const resolveSelectedProfile = (
  upload: CsvUpload,
  profileId: ImportContentProfileId
): ImportContentProfile => {
  const profile = ALL_PROFILES.find((p) => p.profileId === profileId);
  if (!profile) {
    throw new DomainError(
      400,
      'Unknown content profile.',
      'IMPORT_INVALID_SELECTION'
    );
  }
  if (!profile.matches(upload)) {
    throw new DomainError(
      400,
      'The selected format does not match this file.',
      'IMPORT_INVALID_SELECTION'
    );
  }
  return profile;
};

/**
 * Return suggested profile IDs for `mapping_required` — profiles whose
 * positional/structural heuristics partially match the upload.
 * For now we suggest all non-internal profiles that at least have the right
 * column count; callers may narrow further.
 */
export const suggestCompatibleProfileIds = (
  _upload: CsvUpload
): ImportContentProfileId[] => {
  // v1: always offer all known profiles (except internal — it has distinct required headers)
  return ALL_PROFILES.filter((p) => p.profileId !== 'internal').map(
    (p) => p.profileId
  );
};
