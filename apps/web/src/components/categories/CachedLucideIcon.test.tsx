import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CachedLucideIcon } from '@/components/categories/CachedLucideIcon';

describe('CachedLucideIcon', () => {
  it('renders a stored PascalCase icon name', async () => {
    render(<CachedLucideIcon name="ShoppingCart" size={16} />);

    await waitFor(() => {
      expect(document.querySelector('svg.lucide-shopping-cart')).toBeTruthy();
    });
  });

  it('falls back to Tag for unknown icon names', () => {
    render(<CachedLucideIcon name="NotARealLucideIcon" size={16} />);

    expect(document.querySelector('svg.lucide-tag')).toBeTruthy();
    expect(screen.queryByTitle('NotARealLucideIcon')).toBeNull();
  });
});
