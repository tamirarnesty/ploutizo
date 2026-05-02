import { Outlet, createFileRoute } from '@tanstack/react-router';
import { SidebarInset, SidebarProvider } from '@ploutizo/ui/components/sidebar';
import { AppSidebar } from '../components/AppSidebar';
import { TopBar } from '../components/TopBar';
import { useThemeKeyboardShortcut } from '../hooks/useThemeKeyboardShortcut';

export const Route = createFileRoute('/_layout')({
  component: LayoutShell,
});

function getSidebarDefaultOpen() {
  const match = document.cookie.match(/(?:^|; )sidebar_state=([^;]*)/);
  return match ? match[1] !== 'false' : true;
}

function LayoutShell() {
  useThemeKeyboardShortcut();
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SidebarProvider
        defaultOpen={getSidebarDefaultOpen()}
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
