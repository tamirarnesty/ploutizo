import { createFileRoute, Outlet } from "@tanstack/react-router"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@ploutizo/ui/components/sidebar"
import { AppSidebar } from "../components/app-sidebar"

export const Route = createFileRoute("/_layout")({
  component: LayoutShell,
})

function LayoutShell() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* SidebarTrigger renders the hamburger button on mobile, nothing on desktop (D-06) */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
