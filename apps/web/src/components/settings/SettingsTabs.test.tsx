import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import { getRouter } from '@/router';
import { routerMocks, useRouterMock } from '@/test/tanstackRouterMocks';
import { SettingsTabs } from './SettingsTabs';

const appRouter = getRouter();

describe('SettingsTabs', () => {
  beforeEach(() => {
    resetRouterMocks();
    useRouterMock.mockReturnValue(appRouter);
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
