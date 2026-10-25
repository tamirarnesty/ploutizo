import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRouterMocks, routerMocks } from '@/test/mockTanstackRouter';
import { SettingsTabs } from './SettingsTabs';

vi.mock('@/lib/navigation/collect-nav', () => ({
  collectSettingsSectionNav: () => [
    { label: 'Categories & Tags', to: '/settings/categories' },
    { label: 'Merchant Rules', to: '/settings/merchant-rules' },
    { label: 'Household', to: '/settings/household' },
  ],
}));

describe('SettingsTabs', () => {
  beforeEach(() => {
    resetRouterMocks();
    routerMocks.pathname = '/settings/categories';
  });

  it('uses intent preloading on tab links', () => {
    render(<SettingsTabs />);

    expect(
      screen.getByRole('link', { name: 'Categories & Tags' })
    ).toHaveAttribute('data-preload', 'intent');
    expect(
      screen.getByRole('link', { name: 'Merchant Rules' })
    ).toHaveAttribute('data-preload', 'intent');
    expect(screen.getByRole('link', { name: 'Household' })).toHaveAttribute(
      'data-preload',
      'intent'
    );
  });
});
