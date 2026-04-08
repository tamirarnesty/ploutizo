import { Outlet, createFileRoute } from "@tanstack/react-router"
import {
  SidebarInset,
  SidebarProvider,
} from "@ploutizo/ui/components/sidebar"
import { AppSidebar } from "../components/AppSidebar"
import { TopBar } from "../components/TopBar"

export const Route = createFileRoute("/_layout")({
  component: LayoutShell,
})

function LayoutShell() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 overflow-auto p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
