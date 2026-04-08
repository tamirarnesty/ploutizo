import { SidebarTrigger } from "@ploutizo/ui/components/sidebar"
import { UserButton } from "@clerk/tanstack-react-start"

export function TopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      {/* Mobile-only hamburger — SidebarTrigger uses useSidebar() from parent SidebarProvider */}
      <SidebarTrigger className="md:hidden" />
      {/* Spacer ensures UserButton pins right on desktop (no trigger present on desktop) */}
      <div className="flex-1" />
      <UserButton />
    </header>
  )
}
