import { memo, useEffect, useSyncExternalStore } from 'react';
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

    useEffect(() => {
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

    if (!isKnown || entry === 'missing' || entry === 'pending') {
      return <Tag size={size} className={className} aria-hidden="true" />;
    }

    const Icon = entry;
    return <Icon size={size} className={className} aria-hidden="true" />;
  }
);

CachedLucideIcon.displayName = 'CachedLucideIcon';

export const renderLucideIcon = (
  iconName: string | null,
  size = 16,
  className?: string
) => <CachedLucideIcon name={iconName} size={size} className={className} />;
