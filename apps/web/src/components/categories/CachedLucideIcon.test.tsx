import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CachedLucideIcon } from '@/components/categories/CachedLucideIcon';
import * as lucideIconCache from '@/components/categories/lucideIconCache';

vi.mock('@/components/categories/lucideIconCache', async (importOriginal) => {
  const actual = await importOriginal<typeof lucideIconCache>();

  return {
    ...actual,
    getLucideIconCacheSnapshot: vi.fn(actual.getLucideIconCacheSnapshot),
  };
});

describe('CachedLucideIcon', () => {
  it('renders a stored PascalCase icon name', async () => {
    render(<CachedLucideIcon name="ShoppingCart" size={16} />);

    await waitFor(() => {
      expect(document.querySelector('svg.lucide-shopping-cart')).toBeTruthy();
    });
  });

  it('renders a default seeded category icon', async () => {
    render(<CachedLucideIcon name="Receipt" size={16} />);

    await waitFor(() => {
      expect(document.querySelector('svg.lucide-receipt')).toBeTruthy();
    });
  });

  it('falls back to Tag for unknown icon names', () => {
    render(<CachedLucideIcon name="NotARealLucideIcon" size={16} />);

    expect(document.querySelector('svg.lucide-tag')).toBeTruthy();
    expect(screen.queryByTitle('NotARealLucideIcon')).toBeNull();
  });

  it('reserves space instead of Tag while a known icon is loading', () => {
    vi.mocked(lucideIconCache.getLucideIconCacheSnapshot).mockReturnValue(
      'pending'
    );

    render(<CachedLucideIcon name="ShoppingCart" size={16} />);

    expect(document.querySelector('svg.lucide-tag')).toBeNull();
    expect(document.querySelector('span[aria-hidden="true"]')).toBeTruthy();
  });
});
