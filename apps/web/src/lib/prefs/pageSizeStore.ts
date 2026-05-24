import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  PAGE_SIZE_SCOPES,
  PAGE_SIZE_STORAGE_KEYS,
  getDefaultPageSize,
  isAllowedPageSize,
} from './pageSizeConfig';
import { createPerKeyLocalStorage } from './perKeyLocalStorage';
import type { PageSizeScope } from './pageSizeConfig';

type PageSizeState = {
  pageSizes: Record<PageSizeScope, number>;
  setPageSize: (scope: PageSizeScope, size: number) => void;
};

const buildDefaultPageSizes = (): Record<PageSizeScope, number> => {
  const pageSizes = {} as Record<PageSizeScope, number>;
  for (const scope of Object.keys(PAGE_SIZE_SCOPES) as PageSizeScope[]) {
    pageSizes[scope] = getDefaultPageSize(scope);
  }
  return pageSizes;
};

export const usePageSizeStore = create<PageSizeState>()(
  persist(
    (set, get) => ({
      pageSizes: buildDefaultPageSizes(),
      setPageSize: (scope, size) => {
        if (!isAllowedPageSize(scope, size)) return;
        if (get().pageSizes[scope] === size) return;
        set((state) => ({
          pageSizes: { ...state.pageSizes, [scope]: size },
        }));
      },
    }),
    {
      name: 'ploutizo:page-sizes',
      storage: createJSONStorage(() => createPerKeyLocalStorage()),
      partialize: (state) => ({ pageSizes: state.pageSizes }),
      skipHydration: true,
    }
  )
);

if (typeof window !== 'undefined') {
  usePageSizeStore.persist.rehydrate();

  const pageSizeStorageKeys = new Set<string>(PAGE_SIZE_STORAGE_KEYS);
  window.addEventListener('storage', (event) => {
    if (event.key !== null && pageSizeStorageKeys.has(event.key)) {
      usePageSizeStore.persist.rehydrate();
    }
  });
}

export const readStoredPageSize = (scope: PageSizeScope): number =>
  usePageSizeStore.getState().pageSizes[scope];

export const persistPageSize = (scope: PageSizeScope, pageSize: number) => {
  usePageSizeStore.getState().setPageSize(scope, pageSize);
};
