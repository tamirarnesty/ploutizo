import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@ploutizo/ui/components/sidebar';
import { resetRouterMocks } from '@/test/mockTanstackRouter';
import { getRouter } from '@/router';
import { fireModKey } from '@/test/keyboard';
import { registerNavTestRouter, routerMocks } from '@/test/tanstackRouterMocks';
import { AppSidebar } from './AppSidebar';

registerNavTestRouter(getRouter());

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
    resetRouterMocks();
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

  it('opens the Import branch on an Import History deep link', () => {
    renderSidebar('/import/history');

    expect(
      screen.getByRole('link', { name: 'Import History' })
    ).toHaveAttribute('href', '/import/history');
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

  it('keeps the collapse trigger left of the theme control', async () => {
    renderSidebar();

    const footer = document.querySelector('[data-sidebar="footer"]');
    expect(footer).not.toBeNull();

    const trigger = footer!.querySelector('[data-sidebar="trigger"]');
    const themeToggle = await screen.findByRole('button', {
      name: 'Switch to dark mode',
    });

    expect(trigger).not.toBeNull();
    expect(
      trigger!.compareDocumentPosition(themeToggle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('toggles the sidebar from the keyboard shortcut', () => {
    renderSidebar();

    const sidebar = document.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveAttribute('data-state', 'expanded');

    fireModKey('b');

    expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  });
});
