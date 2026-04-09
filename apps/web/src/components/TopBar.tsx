import { OrganizationSwitcher, UserButton } from "@clerk/tanstack-react-start"
import { SidebarTrigger } from "@ploutizo/ui/components/sidebar"
import { AppLogo } from "./AppLogo"

export function TopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center gap-3 bg-sidebar px-4 relative z-20">
      {/* Mobile-only sidebar trigger — left of logo */}
      <SidebarTrigger className="md:hidden" />
      <AppLogo />
      <div className="ml-auto flex items-center gap-2">
        <OrganizationSwitcher
          hidePersonal={true}
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
        <div className="hidden md:block">
          <UserButton />
        </div>
      </div>
    </header>
  )
}
