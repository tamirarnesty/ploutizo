import {
  PAGE_SIZE_SCOPES,
  getDefaultPageSize,
  isAllowedPageSize,
} from './pageSizeConfig';
import type { PageSizeScope } from './pageSizeConfig';
import type { StateStorage } from 'zustand/middleware';

type PersistedPageSizes = {
  pageSizes: Record<PageSizeScope, number>;
};

const parseScopeValue = (scope: PageSizeScope, raw: string | null): number => {
  if (raw === null) return getDefaultPageSize(scope);
  const parsed = Number(raw);
  return isAllowedPageSize(scope, parsed) ? parsed : getDefaultPageSize(scope);
};

const readPageSizes = (): Record<PageSizeScope, number> => {
  const pageSizes = {} as Record<PageSizeScope, number>;
  for (const scope of Object.keys(PAGE_SIZE_SCOPES) as PageSizeScope[]) {
    const { storageKey } = PAGE_SIZE_SCOPES[scope];
    pageSizes[scope] = parseScopeValue(scope, localStorage.getItem(storageKey));
  }
  return pageSizes;
};

export const createPerKeyLocalStorage = (): StateStorage => ({
  getItem: () =>
    JSON.stringify({
      state: { pageSizes: readPageSizes() } satisfies PersistedPageSizes,
      version: 0,
    }),

  setItem: (_name, value) => {
    let parsed: { state?: PersistedPageSizes };
    try {
      parsed = JSON.parse(value) as { state?: PersistedPageSizes };
    } catch {
      return;
    }

    const pageSizes = parsed.state?.pageSizes;
    if (!pageSizes) return;

    for (const scope of Object.keys(PAGE_SIZE_SCOPES) as PageSizeScope[]) {
      const size = pageSizes[scope];
      if (!isAllowedPageSize(scope, size)) continue;

      const { storageKey } = PAGE_SIZE_SCOPES[scope];
      const serialized = String(size);
      const current = localStorage.getItem(storageKey);
      if (current !== serialized) {
        localStorage.setItem(storageKey, serialized);
      }
    }
  },

  removeItem: () => {
    for (const scope of Object.keys(PAGE_SIZE_SCOPES) as PageSizeScope[]) {
      localStorage.removeItem(PAGE_SIZE_SCOPES[scope].storageKey);
    }
  },
});
