import { Link, useRouterState } from "@tanstack/react-router"
import { OrganizationSwitcher, UserButton } from "@clerk/tanstack-react-start"
import { CreditCard, Home, LayoutDashboard, Store, Tag } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ploutizo/ui/components/sidebar"
import { ThemeToggle } from "@ploutizo/ui/components/theme-toggle"

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  // /accounts 404s until Plan 03 creates the route — expected during Plan 02 execution
  { label: "Accounts", to: "/accounts", icon: CreditCard },
] as const

const settingsItems = [
  { label: "Categories & Tags", to: "/settings/categories", icon: Tag },
  { label: "Merchant Rules", to: "/settings/merchant-rules", icon: Store },
  { label: "Household", to: "/settings/household", icon: Home },
] as const

export const AppSidebar = () => {
  const { location } = useRouterState()

  return (
    <Sidebar>
      {/* OrganizationSwitcher pinned at top (D-02) */}
      <SidebarHeader>
        <OrganizationSwitcher
          hidePersonal={true}
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
      </SidebarHeader>

      <SidebarContent>
        {/* Primary nav items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map(({ label, to, icon: Icon }) => {
                const active =
                  location.pathname === to ||
                  location.pathname.startsWith(to + "/")
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={to}>
                        <Icon />
                        {label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings group (D-01) */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {settingsItems.map(({ label, to, icon: Icon }) => {
                const active = location.pathname === to
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={to}>
                        <Icon />
                        {label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ThemeToggle + UserButton pinned at bottom (D-02, D-04) */}
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
