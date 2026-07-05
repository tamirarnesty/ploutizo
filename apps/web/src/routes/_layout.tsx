import {
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import { SidebarInset, SidebarProvider } from '@ploutizo/ui/components/sidebar';
import { cn } from '@ploutizo/ui/lib/utils';
import { CommandPaletteProvider } from '@/lib/command';
import { resolveMainContentLayout } from '@/lib/layout/main-content-layout';
import { AppSidebar } from '../components/AppSidebar';
import { TopBar } from '../components/TopBar';
import { useThemeKeyboardShortcut } from '../hooks/useThemeKeyboardShortcut';

const getSidebarState = createServerFn().handler(() => {
  const value = getCookie('sidebar_state');
  return value !== 'false';
});

const LayoutShell = () => {
  useThemeKeyboardShortcut();
  const defaultOpen = Route.useLoaderData();
  const mainContentLayout = useRouterState({
    select: (state) => resolveMainContentLayout(state.matches),
  });

  return (
    <CommandPaletteProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        <SidebarProvider
          defaultOpen={defaultOpen}
          className="min-h-0 flex-1 flex-col"
        >
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <AppSidebar />
            <SidebarInset className="min-w-0">
              <main
                className={cn(
                  'flex min-h-0 flex-1 flex-col p-6',
                  mainContentLayout === 'scroll' && 'overflow-auto',
                  mainContentLayout === 'viewport' && 'overflow-hidden'
                )}
              >
                <Outlet />
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </CommandPaletteProvider>
  );
};

export const Route = createFileRoute('/_layout')({
  loader: () => getSidebarState(),
  component: LayoutShell,
});
