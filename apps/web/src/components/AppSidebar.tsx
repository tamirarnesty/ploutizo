import { Link, useRouterState } from "@tanstack/react-router"
import { OrganizationSwitcher } from "@clerk/tanstack-react-start"
import { CreditCard, LayoutDashboard, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@ploutizo/ui/components/sidebar"
import { ThemeToggle } from "@ploutizo/ui/components/theme-toggle"

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  // /accounts 404s until Plan 03 creates the route — expected during Plan 02 execution
  { label: "Accounts", to: "/accounts", icon: CreditCard },
] as const

export const AppSidebar = () => {
  const { location } = useRouterState()

  const isSettingsActive = location.pathname.startsWith("/settings")

  return (
    <Sidebar collapsible="icon">
      {/* Ploutizo wordmark + OrganizationSwitcher — collapses to nothing in icon-only mode (D-08, D-09) */}
      <SidebarHeader>
        <div className="flex items-center justify-between px-3 h-12 group-data-[collapsible=icon]:hidden">
          <span className="font-sans text-base font-medium text-sidebar-foreground">Ploutizo</span>
          <OrganizationSwitcher
            hidePersonal={true}
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
          />
        </div>
      </SidebarHeader>

      {/* Primary nav — flat list, no group label (D-10: settings group removed) */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map(({ label, to, icon: Icon }) => {
                const active =
                  location.pathname === to ||
                  location.pathname.startsWith(to + "/")
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={label}
                      render={<Link to={to} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: left cluster (ThemeToggle + Settings link) + right (collapse toggle) (D-02, D-11) */}
      <SidebarFooter>
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isSettingsActive}
                  tooltip="Settings"
                  render={<Link to="/settings" />}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
          <SidebarTrigger />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
