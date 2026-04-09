import { Outlet, createFileRoute } from "@tanstack/react-router"
import {
  SidebarInset,
  SidebarProvider,
} from "@ploutizo/ui/components/sidebar"
import { AppSidebar } from "../components/AppSidebar"
import { TopBar } from "../components/TopBar"
import { useThemeKeyboardShortcut } from "../hooks/useThemeKeyboardShortcut"

export const Route = createFileRoute("/_layout")({
  component: LayoutShell,
})

function LayoutShell() {
  useThemeKeyboardShortcut()
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SidebarProvider className="flex-col flex-1 min-h-0">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
