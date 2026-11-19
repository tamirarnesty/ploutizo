import {
  OrganizationSwitcher,
  UserButton,
  useAuth,
} from '@clerk/tanstack-react-start';
import { SidebarTrigger } from '@ploutizo/ui/components/sidebar';
import { Separator } from '@ploutizo/ui/components/separator';
import { AppLogo } from './AppLogo';

export const TopBar = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const showClerkChrome = isLoaded && isSignedIn;

  return (
    <header className="z-20 flex min-h-12 shrink-0 items-center gap-2 bg-sidebar px-3 pt-2 md:gap-3 md:px-4">
      {/* Mobile-only sidebar trigger — left of logo. 44px tall for a thumb. */}
      <SidebarTrigger className="size-11 md:hidden" />
      <AppLogo />
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {showClerkChrome ? (
          <>
            <OrganizationSwitcher
              hidePersonal={true}
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: 'min-w-0',
                  organizationSwitcherTrigger:
                    'max-w-[9rem] px-2 sm:max-w-none',
                },
              }}
            />
            <Separator orientation="vertical" className="hidden sm:flex" />
            <UserButton />
          </>
        ) : null}
      </div>
    </header>
  );
};
