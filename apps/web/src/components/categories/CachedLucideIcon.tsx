import { memo, useLayoutEffect, useSyncExternalStore } from 'react';
import { Tag } from 'lucide-react';
import {
  getLucideIconCacheSnapshot,
  loadLucideIcon,
  subscribeLucideIconCache,
} from '@/components/categories/lucideIconCache';
import {
  isKnownLucideIcon,
  pascalToKebab,
} from '@/components/categories/lucideIconNames';

type CachedLucideIconProps = {
  name: string | null;
  size?: number;
  className?: string;
};

export const CachedLucideIcon = memo(
  ({ name, size = 16, className }: CachedLucideIconProps) => {
    const kebabName = name ? pascalToKebab(name) : null;
    const isKnown = name ? isKnownLucideIcon(name) : false;

    useLayoutEffect(() => {
      if (kebabName && isKnown) loadLucideIcon(kebabName);
    }, [kebabName, isKnown]);

    const entry = useSyncExternalStore(
      subscribeLucideIconCache,
      () =>
        kebabName && isKnown
          ? getLucideIconCacheSnapshot(kebabName)
          : ('missing' as const),
      () => 'pending' as const
    );

    if (!name || !isKnown || entry === 'missing') {
      return <Tag size={size} className={className} aria-hidden="true" />;
    }

    if (entry === 'pending') {
      return (
        <span
          className={className}
          style={{ width: size, height: size, display: 'inline-block' }}
          aria-hidden="true"
        />
      );
    }

    const Icon = entry;
    return <Icon size={size} className={className} aria-hidden="true" />;
  }
);

CachedLucideIcon.displayName = 'CachedLucideIcon';
