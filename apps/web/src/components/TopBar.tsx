import { OrganizationSwitcher, UserButton } from "@clerk/tanstack-react-start"
import { SidebarTrigger } from "@ploutizo/ui/components/sidebar"

export function TopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center gap-3 bg-sidebar px-4 relative z-20">
      {/* Mobile-only sidebar trigger — left of wordmark */}
      <SidebarTrigger className="md:hidden" />
      {/* Ploutizo wordmark */}
      <span className="font-medium text-sm text-sidebar-foreground">Ploutizo</span>
      {/* Org switcher */}
      <OrganizationSwitcher
        hidePersonal={true}
        afterCreateOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
      />
      <div className="flex-1" />
      {/* UserButton with full name */}
      <UserButton showName />
    </header>
  )
}
