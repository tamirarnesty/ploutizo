import { GENERIC_POSITIONAL_IMPORT_PROFILE_IDS } from '@ploutizo/types';
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

const CONTENT_PROFILES: ImportContentProfile[] = [
  amexContentProfile,
  pcFinancialContentProfile,
  mdyDebitCreditBalanceProfile,
  isoDebitCreditMaskedCardProfile,
  internalContentProfile,
];

const namedContentProfiles = CONTENT_PROFILES.filter(
  (profile) => profile.profileId !== 'internal'
);

/**
 * Inspect a parsed CSV upload and return the matching profile(s).
 * The internal profile is only returned if no named profile matches.
 * Does not throw — the caller decides how to handle zero or multiple matches.
 */
export const findMatchingProfiles = (
  upload: CsvUpload
): ImportContentProfile[] => {
  const namedMatches = namedContentProfiles.filter((profile) =>
    profile.matches(upload)
  );
  if (namedMatches.length > 0) return namedMatches;
  if (internalContentProfile.matches(upload)) return [internalContentProfile];
  return [];
};

const genericPositionalProfileIds = new Set<string>(
  GENERIC_POSITIONAL_IMPORT_PROFILE_IDS
);

const isAutoDetectableProfile = (profileId: ImportContentProfileId) =>
  !genericPositionalProfileIds.has(profileId);

/** Profiles eligible for upload without an explicit member selection. */
export const findAutoDetectableProfiles = (
  upload: CsvUpload
): ImportContentProfile[] =>
  findMatchingProfiles(upload).filter((profile) =>
    isAutoDetectableProfile(profile.profileId)
  );

/**
 * Return the profile for a member-confirmed profile ID.
 * Throws if the file cannot be parsed as that layout.
 */
export const resolveSelectedProfile = (
  upload: CsvUpload,
  profileId: ImportContentProfileId
): ImportContentProfile => {
  const profile = CONTENT_PROFILES.find((p) => p.profileId === profileId);
  if (!profile) {
    throw new DomainError(
      400,
      'Unknown content profile.',
      'IMPORT_INVALID_SELECTION'
    );
  }
  if (!profile.acceptsSelection(upload)) {
    throw new DomainError(
      400,
      'The selected format does not match this file.',
      'IMPORT_INVALID_SELECTION'
    );
  }
  return profile;
};
