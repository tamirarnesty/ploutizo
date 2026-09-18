import { useLayoutEffect } from 'react';
import { preloadLucideIcons } from '@/components/categories/lucideIconCache';

export const usePreloadLucideIcons = (
  names: readonly (string | null | undefined)[]
): void => {
  useLayoutEffect(() => {
    preloadLucideIcons(names);
  }, [names]);
};
