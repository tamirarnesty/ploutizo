import { useCallback, useRef } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { CreditCard, LayoutDashboard, Receipt, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@ploutizo/ui/components/sidebar';
import { ThemeToggle } from '@ploutizo/ui/components/theme-toggle';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: Receipt },
  // /accounts 404s until Plan 03 creates the route — expected during Plan 02 execution
  { label: 'Accounts', to: '/accounts', icon: CreditCard },
] as const;

export const AppSidebar = () => {
  const { location } = useRouterState();
  const isSettingsActive = location.pathname.startsWith('/settings');

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
              {navItems.map(({ label, to, icon: Icon }) => {
                const active =
                  location.pathname === to ||
                  location.pathname.startsWith(to + '/');
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={<Link to={to} onClick={closeMobile} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
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
                  tooltip="Settings"
                  render={<Link to="/settings" onClick={closeMobile} />}
                >
                  <Settings />
                  <span>Settings</span>
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
