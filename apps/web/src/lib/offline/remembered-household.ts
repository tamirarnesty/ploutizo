import type { BrowserPersistenceScope } from '@/lib/persistence/browser-database-scope';

const STORAGE_KEY = 'ploutizo:offline:household';

const SAFE_SCOPE_ID = /^[A-Za-z0-9_-]+$/;

const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cached: BrowserPersistenceScope | null = null;

const emit = () => {
  cachedRaw = undefined;
  for (const listener of listeners) {
    listener();
  }
};

const readRaw = () => {
  if (import.meta.env.SSR || typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
};

const parseRemembered = (
  raw: string | null
): BrowserPersistenceScope | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      signedInMemberId?: unknown;
      activeHouseholdId?: unknown;
    };
    if (
      typeof parsed.signedInMemberId !== 'string' ||
      typeof parsed.activeHouseholdId !== 'string' ||
      !SAFE_SCOPE_ID.test(parsed.signedInMemberId) ||
      !SAFE_SCOPE_ID.test(parsed.activeHouseholdId)
    ) {
      return null;
    }
    return {
      signedInMemberId: parsed.signedInMemberId,
      activeHouseholdId: parsed.activeHouseholdId,
    };
  } catch {
    return null;
  }
};

/** Last household that opened the database on this device. Not financial data. */
export const readRememberedHousehold = (): BrowserPersistenceScope | null => {
  const raw = readRaw();
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = parseRemembered(raw);
  return cached;
};

export const writeRememberedHousehold = (scope: BrowserPersistenceScope) => {
  if (import.meta.env.SSR || typeof localStorage === 'undefined') return;
  if (
    !SAFE_SCOPE_ID.test(scope.signedInMemberId) ||
    !SAFE_SCOPE_ID.test(scope.activeHouseholdId)
  ) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scope));
  emit();
};

export const clearRememberedHousehold = () => {
  if (import.meta.env.SSR || typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  emit();
};

export const subscribeRememberedHousehold = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
