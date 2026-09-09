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
  useRouterState: () => ({ location: { pathname: routerMocks.pathname } }),
}));

vi.mock('@/lib/command', () => ({
  CommandPaletteTrigger: () => (
    <button type="button" aria-label="Open command palette">
      Search
    </button>
  ),
}));

const renderSidebar = (pathname = '/dashboard') => {
  routerMocks.pathname = pathname;
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
};

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
    renderSidebar('/import');

    if (!screen.queryByRole('link', { name: 'Import History' })) {
      await user.click(
        screen.getByRole('button', { name: 'Toggle Import submenu' })
      );
    }

    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toHaveAttribute('href', '/import/history');
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      '/import'
    );
  });

  it('opens the Import branch on an Import History deep link', () => {
    renderSidebar('/import/history');

    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toHaveAttribute('href', '/import/history');
  });
});
