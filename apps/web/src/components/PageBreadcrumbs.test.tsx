import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import type * as TanstackRouterModule from '@tanstack/react-router';
import type { ReactNode } from 'react';

const matchesMock = vi.hoisted(() => ({
  current: [] as Record<string, unknown>[],
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof TanstackRouterModule>();
  return {
    ...actual,
    useMatches: () => matchesMock.current,
    Link: ({ to, children }: { to: string; children?: ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

const match = (
  routeId: string,
  pathname: string,
  nav?: { label: string; group?: 'navigation' | 'settings' }
) => ({
  routeId,
  pathname,
  staticData: nav ? { nav } : {},
});

describe('PageBreadcrumbs', () => {
  beforeEach(() => {
    matchesMock.current = [];
  });

  it('renders ancestors as links and omits the labeled leaf', () => {
    matchesMock.current = [
      match('/_layout', '/'),
      match('/_layout/import', '/import', { label: 'Import' }),
      match('/_layout/import/history', '/import/history', {
        label: 'Import History',
      }),
    ];

    render(<PageBreadcrumbs />);

    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/import'
    );
    expect(screen.queryByText('Import History')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders nothing on a top-level page with no labeled ancestor', () => {
    matchesMock.current = [
      match('/_layout', '/'),
      match('/_layout/transactions', '/transactions', {
        label: 'Transactions',
      }),
    ];

    const { container } = render(<PageBreadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the only labeled ancestor is the page itself', () => {
    matchesMock.current = [
      match('/_layout', '/'),
      match('/_layout/import', '/import', { label: 'Import' }),
      match('/_layout/import/', '/import'),
    ];

    const { container } = render(<PageBreadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the index leaf reports a trailing-slash pathname', () => {
    matchesMock.current = [
      match('/_layout', '/'),
      match('/_layout/import', '/import', { label: 'Import' }),
      match('/_layout/import/', '/import/'),
    ];

    const { container } = render(<PageBreadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });

  it('skips settings-group ancestors', () => {
    matchesMock.current = [
      match('/_layout', '/'),
      match('/_layout/settings', '/settings', {
        label: 'Settings',
        group: 'settings',
      }),
      match('/_layout/settings/categories', '/settings/categories', {
        label: 'Categories & Tags',
      }),
    ];

    const { container } = render(<PageBreadcrumbs />);

    expect(container).toBeEmptyDOMElement();
  });

  it('chains multiple ancestors in route order', () => {
    matchesMock.current = [
      match('/_layout', '/'),
      match('/_layout/import', '/import', { label: 'Import' }),
      match('/_layout/import/$draftId', '/import/draft_1'),
      match('/_layout/import/$draftId/finalize', '/import/draft_1/finalize'),
    ];

    render(<PageBreadcrumbs />);

    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/import'
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });
});
