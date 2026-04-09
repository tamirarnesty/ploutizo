import { OrganizationSwitcher, UserButton } from '@clerk/tanstack-react-start';
import { SidebarTrigger } from '@ploutizo/ui/components/sidebar';
import { Separator } from '@ploutizo/ui/components/separator';
import { AppLogo } from './AppLogo';

export function TopBar() {
  return (
    <header className="z-20 flex min-h-12 shrink-0 items-center gap-3 bg-sidebar px-4 pt-2">
      {/* Mobile-only sidebar trigger — left of logo */}
      <SidebarTrigger className="md:hidden" />
      <AppLogo />
      <div className="ml-auto flex items-center gap-2">
        <OrganizationSwitcher
          hidePersonal={true}
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
        <Separator orientation="vertical" className="hidden sm:flex" />
        <div className="hidden items-center sm:flex">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
