import { Link, useRouterState } from "@tanstack/react-router"
import { CreditCard, LayoutDashboard, Settings } from "lucide-react"
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
} from "@ploutizo/ui/components/sidebar"


const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  // /accounts 404s until Plan 03 creates the route — expected during Plan 02 execution
  { label: "Accounts", to: "/accounts", icon: CreditCard },
] as const

export const AppSidebar = () => {
  const { location } = useRouterState()
  const isSettingsActive = location.pathname.startsWith("/settings")

  return (
    <Sidebar collapsible="icon" variant="inset" className="top-10">
      {/* Primary nav */}
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

        {/* Settings — pushed to bottom of content via mt-auto */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: collapse toggle only — ThemeToggle moved to TopBar */}
      <SidebarFooter>
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  )
}
