import { dynamicIconImports } from 'lucide-react/dynamic';
import {
  pascalToKebab,
  toLucideIconName,
} from '@/components/categories/lucideIconNames';
import type { DynamicIconModule } from 'lucide-react/dynamic';
import type { LucideIcon } from 'lucide-react';

type CacheState = 'pending' | 'missing';
type CacheEntry = LucideIcon | CacheState;

const iconComponentCache = new Map<string, CacheEntry>();
const inflightLoads = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const subscribeLucideIconCache = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getLucideIconCacheSnapshot = (kebabName: string): CacheEntry => {
  const iconName = toLucideIconName(kebabName);
  if (!iconName) return 'missing';
  return iconComponentCache.get(iconName) ?? 'pending';
};

export const loadLucideIcon = (kebabName: string): void => {
  const iconName = toLucideIconName(kebabName);
  if (!iconName) {
    if (!iconComponentCache.has(kebabName)) {
      iconComponentCache.set(kebabName, 'missing');
      notify();
    }
    return;
  }

  if (iconComponentCache.has(iconName) || inflightLoads.has(iconName)) {
    return;
  }

  iconComponentCache.set(iconName, 'pending');
  const load = dynamicIconImports[iconName]()
    .then((mod: DynamicIconModule) => {
      iconComponentCache.set(iconName, mod.default);
    })
    .catch(() => {
      iconComponentCache.set(iconName, 'missing');
    })
    .finally(() => {
      inflightLoads.delete(iconName);
      notify();
    });

  inflightLoads.set(iconName, load);
};

export const preloadLucideIcons = (
  pascalNames: Iterable<string | null | undefined>
): void => {
  for (const name of pascalNames) {
    if (!name) continue;
    loadLucideIcon(pascalToKebab(name));
  }
};
