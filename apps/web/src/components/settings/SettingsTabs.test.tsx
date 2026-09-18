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

  it('renders URL-navigating tabs with correct hrefs', () => {
    render(<SettingsTabs />);

    expect(
      screen.getByRole('link', { name: 'Categories & Tags' })
    ).toHaveAttribute('href', '/settings/categories');
    expect(
      screen.getByRole('link', { name: 'Merchant Rules' })
    ).toHaveAttribute('href', '/settings/merchant-rules');
    expect(screen.getByRole('link', { name: 'Household' })).toHaveAttribute(
      'href',
      '/settings/household'
    );
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
