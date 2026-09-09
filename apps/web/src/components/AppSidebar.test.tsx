import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@ploutizo/ui/components/sidebar';
import { AppSidebar } from './AppSidebar';

const routerMocks = vi.hoisted(() => ({
  pathname: '/dashboard',
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    onClick,
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
  useRouterState: (options?: {
    select?: (state: { location: { pathname: string } }) => unknown;
  }) => {
    const state = { location: { pathname: routerMocks.pathname } };
    return options?.select ? options.select(state) : state;
  },
}));

vi.mock('@/lib/command', () => ({
  CommandPaletteTrigger: () => (
    <button type="button" aria-label="Open command palette">
      Search
    </button>
  ),
}));

const SidebarHarness = ({ pathname }: { pathname: string }) => {
  routerMocks.pathname = pathname;
  return (
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
};

const renderSidebar = (pathname = '/dashboard') =>
  render(<SidebarHarness pathname={pathname} />);

describe('AppSidebar', () => {
  beforeEach(() => {
    routerMocks.pathname = '/dashboard';
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('shows Import as a peer of Transactions without a Transactions submenu', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard'
    );
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'href',
      '/transactions'
    );
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/import'
    );
    expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute(
      'href',
      '/accounts'
    );
    expect(
      screen.queryByRole('button', { name: 'Toggle Transactions submenu' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Toggle Import submenu' })
    ).toBeInTheDocument();
  });

  it('toggles Import History without navigating away from the hub landing', async () => {
    const user = userEvent.setup();
    renderSidebar('/dashboard');

    expect(
      screen.queryByRole('link', { name: 'Import History' })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Toggle Import submenu' })
    );

    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toHaveAttribute('href', '/import/history');
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/import'
    );
  });

  it('reveals Settings destinations from a separate chevron', async () => {
    const user = userEvent.setup();
    renderSidebar('/dashboard');

    expect(
      screen.queryByRole('link', { name: 'Categories & Tags' })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Toggle Settings submenu' })
    );

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

  it('opens the Import branch on an Import History deep link', () => {
    renderSidebar('/import/history');

    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toHaveAttribute('href', '/import/history');
  });

  it('opens the Settings branch on a settings deep link', () => {
    renderSidebar('/settings/categories');

    expect(
      screen.getByRole('link', { name: 'Categories & Tags' })
    ).toHaveAttribute('href', '/settings/categories');
  });

  it('does not change route when toggling the Import submenu', async () => {
    const user = userEvent.setup();
    renderSidebar('/dashboard');

    await user.click(
      screen.getByRole('button', { name: 'Toggle Import submenu' })
    );

    expect(routerMocks.pathname).toBe('/dashboard');
    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toBeInTheDocument();
  });

  it('closes an expanded branch after navigating away from it', () => {
    const { rerender } = renderSidebar('/import/history');

    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toBeInTheDocument();

    rerender(<SidebarHarness pathname="/dashboard" />);

    expect(
      screen.queryByRole('link', { name: 'Import History' })
    ).not.toBeInTheDocument();
  });
});
