import {
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router';
import { SidebarInset, SidebarProvider } from '@ploutizo/ui/components/sidebar';
import { cn } from '@ploutizo/ui/lib/utils';
import { BearerReadinessBoundary } from '@/lib/access';
import { enforceAccessPolicy } from '@/lib/access/enforce-access-policy';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { readCookie } from '@/lib/cookies/persistent-cookie';
import { CommandPaletteProvider } from '@/lib/command';
import { activeImportDraftsQueryOptions } from '@/lib/data-access/imports';
import { resolveMainContentLayout } from '@/lib/layout/main-content-layout';
import { AppSidebar } from '../components/AppSidebar';
import { TopBar } from '../components/TopBar';
import { useThemeKeyboardShortcut } from '../hooks/useThemeKeyboardShortcut';

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
                <BearerReadinessBoundary>
                  <Outlet />
                </BearerReadinessBoundary>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </CommandPaletteProvider>
  );
};

export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ context, location }) => {
    await enforceAccessPolicy(context, 'active-household', location.href);
  },
  loader: async ({ context }) => {
    if (await isHouseholdLoaderReady(context)) {
      await context.queryClient.ensureQueryData(activeImportDraftsQueryOptions);
    }
    return readCookie('sidebar_state') !== 'false';
  },
  component: LayoutShell,
});
