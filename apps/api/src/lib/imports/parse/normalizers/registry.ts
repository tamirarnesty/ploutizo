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
