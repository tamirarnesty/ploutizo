import { useCallback, useRef } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@ploutizo/ui/components/sidebar';
import { ThemeToggle } from '@ploutizo/ui/components/theme-toggle';
import {
  sidebarPrimaryNav,
  sidebarSettingsNav,
  toRegisteredRoute,
} from '@/lib/navigation';

export const AppSidebar = () => {
  const { location } = useRouterState();
  const isSettingsActive = location.pathname.startsWith('/settings');
  const SettingsIcon = sidebarSettingsNav.icon;

  // Store sidebar context in a ref so closeMobile has stable [] deps (advanced-event-handler-refs)
  const sidebarCtx = useSidebar();
  const sidebarRef = useRef(sidebarCtx);
  sidebarRef.current = sidebarCtx;

  const closeMobile = useCallback(() => {
    const { isMobile, setOpenMobile } = sidebarRef.current;
    if (isMobile) setOpenMobile(false);
  }, []);

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="top-10 h-[calc(100svh-2.5rem)]"
    >
      {/* Primary nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {sidebarPrimaryNav.map(({ label, to, icon: Icon, children }) => {
                const active =
                  location.pathname === to ||
                  (to === '/transactions' &&
                    location.pathname.startsWith('/transactions/')) ||
                  (to !== '/transactions' &&
                    location.pathname.startsWith(`${to}/`));
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={
                        <Link
                          to={toRegisteredRoute(to)}
                          onClick={closeMobile}
                        />
                      }
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {children ? (
                      <SidebarMenuSub>
                        {children.map(
                          ({
                            label: childLabel,
                            to: childTo,
                            icon: ChildIcon,
                          }) => (
                            <SidebarMenuSubItem key={childTo}>
                              <SidebarMenuSubButton
                                isActive={location.pathname === childTo}
                                render={
                                  <Link
                                    to={toRegisteredRoute(childTo)}
                                    onClick={closeMobile}
                                  />
                                }
                              >
                                <ChildIcon />
                                <span>{childLabel}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        )}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings — pushed to bottom of content via mt-auto */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isSettingsActive}
                  tooltip={sidebarSettingsNav.label}
                  render={
                    <Link to={sidebarSettingsNav.to} onClick={closeMobile} />
                  }
                >
                  <SettingsIcon />
                  <span>{sidebarSettingsNav.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: ThemeToggle (hidden when collapsed) + collapse toggle (desktop only) */}
      <SidebarFooter className="flex-row items-center justify-between px-2 py-1">
        <div className="group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
        <SidebarTrigger className="hidden md:flex" />
      </SidebarFooter>
    </Sidebar>
  );
};
