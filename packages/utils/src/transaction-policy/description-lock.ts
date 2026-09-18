import { resolveTransactionDescriptionPolicy } from './accessors';
import type {
  ResolveTransactionDescriptionLockInput,
  ResolvedTransactionDescriptionLock,
} from './types';

const trimmed = (value: string): string => value.trim();

/**
 * Derives description lock/manual state from resolved policy plus whether the
 * current value still matches the generated candidate.
 *
 * Match (or empty current) stays generated and adopts the candidate. Mismatch
 * against a known candidate that the field was not following becomes sticky
 * manual. Explicit `userUnlocked` stays manual even if the text later matches.
 *
 * When applying a type/refundOf change that should keep following generated
 * text, pass `previousGeneratedCandidate` equal to the current description so
 * leftover copy is updated instead of treated as a custom mismatch.
 */
export const resolveTransactionDescriptionLock = (
  input: ResolveTransactionDescriptionLockInput
): ResolvedTransactionDescriptionLock => {
  const policyMode = resolveTransactionDescriptionPolicy({
    type: input.type,
    refundOf: input.refundOf,
  }).mode;
  const currentDescription = input.currentDescription;
  const generatedCandidate = input.generatedCandidate;

  if (policyMode !== 'generated') {
    return {
      policyMode,
      userUnlocked: false,
      locked: false,
      description: currentDescription,
    };
  }

  if (input.userUnlocked) {
    return {
      policyMode,
      userUnlocked: true,
      locked: false,
      description: currentDescription,
    };
  }

  const stored = trimmed(currentDescription);
  const candidate = generatedCandidate;
  const previous = input.previousGeneratedCandidate ?? generatedCandidate;
  const wasFollowingGenerated = previous !== '' && stored === trimmed(previous);

  if (candidate && stored && stored !== candidate && !wasFollowingGenerated) {
    return {
      policyMode,
      userUnlocked: true,
      locked: false,
      description: currentDescription,
    };
  }

  const description = candidate || currentDescription;

  return {
    policyMode,
    userUnlocked: false,
    locked: true,
    description,
  };
};
