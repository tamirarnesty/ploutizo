import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@ploutizo/ui/components/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible';
import { ThemeToggle } from '@ploutizo/ui/components/theme-toggle';
import {
  isAppNavRouteActive,
  sidebarPrimaryNav,
  sidebarSettingsNav,
} from '@/lib/navigation';
import { CommandPaletteTrigger } from '@/lib/command';
import type { SidebarNavItem } from '@/lib/navigation/types';

interface SidebarNavigationItemProps {
  item: SidebarNavItem;
  pathname: string;
  onNavigate: () => void;
}

const SidebarParentLink = ({
  item,
  pathname,
  onNavigate,
}: SidebarNavigationItemProps) => {
  const Icon = item.icon;

  return (
    <SidebarMenuButton
      isActive={isAppNavRouteActive(pathname, item.to)}
      tooltip={item.label}
      render={<Link to={item.to} onClick={onNavigate} />}
    >
      <Icon />
      <span>{item.label}</span>
    </SidebarMenuButton>
  );
};

const SidebarNavigationItem = ({
  item,
  pathname,
  onNavigate,
}: SidebarNavigationItemProps) => {
  const isActive = isAppNavRouteActive(pathname, item.to);
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    setOpen(isActive);
  }, [isActive]);

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarParentLink
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <SidebarParentLink
        item={item}
        pathname={pathname}
        onNavigate={onNavigate}
      />
      <SidebarMenuAction
        showOnHover
        aria-label={`Toggle ${item.label} submenu`}
        render={<CollapsibleTrigger />}
      >
        <ChevronRight className="transition-transform group-data-[open]/collapsible:rotate-90" />
      </SidebarMenuAction>
      <CollapsibleContent render={<SidebarMenuSub />}>
        {item.children.map(({ label, to, icon: ChildIcon }) => (
          <SidebarMenuSubItem key={to}>
            <SidebarMenuSubButton
              isActive={isAppNavRouteActive(pathname, to)}
              render={<Link to={to} onClick={onNavigate} />}
            >
              <ChildIcon />
              <span>{label}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const AppSidebar = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

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
      <SidebarHeader>
        <CommandPaletteTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {sidebarPrimaryNav.map((item) => (
                <SidebarNavigationItem
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeMobile}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavigationItem
                item={sidebarSettingsNav}
                pathname={pathname}
                onNavigate={closeMobile}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="flex-row items-center justify-between px-2 py-1">
        <div className="group-data-[collapsible=icon]:hidden">
          <ThemeToggle />
        </div>
        <SidebarTrigger className="hidden md:flex" />
      </SidebarFooter>
    </Sidebar>
  );
};
