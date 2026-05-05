import { Outlet, createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';
import { SidebarInset, SidebarProvider } from '@ploutizo/ui/components/sidebar';
import { AppSidebar } from '../components/AppSidebar';
import { TopBar } from '../components/TopBar';
import { useThemeKeyboardShortcut } from '../hooks/useThemeKeyboardShortcut';

export const Route = createFileRoute('/_layout')({
  loader: () => getSidebarState(),
  component: LayoutShell,
});

const getSidebarState = createServerFn().handler(() => {
  const value = getCookie('sidebar_state');
  return value !== 'false';
});

function LayoutShell() {
  useThemeKeyboardShortcut();
  const defaultOpen = Route.useLoaderData();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SidebarProvider
        defaultOpen={defaultOpen}
        className="min-h-0 flex-1 flex-col"
      >
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
