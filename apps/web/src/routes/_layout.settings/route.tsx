import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router"
import { Home, Store, Tag } from "lucide-react"
import { cn } from "@ploutizo/ui/lib/utils"

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsLayout,
})

const settingsNavItems = [
  { label: "Categories & Tags", to: "/settings/categories", icon: Tag },
  { label: "Merchant Rules", to: "/settings/merchant-rules", icon: Store },
  { label: "Household", to: "/settings/household", icon: Home },
] as const

function SettingsLayout() {
  const { location } = useRouterState()

  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0 flex flex-col gap-1" aria-label="Settings navigation">
        {settingsNavItems.map(({ label, to, icon: Icon }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm min-w-0",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
