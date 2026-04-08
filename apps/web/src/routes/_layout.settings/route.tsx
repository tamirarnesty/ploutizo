import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router"
import { Tabs, TabsList, TabsTrigger } from "@ploutizo/ui/components/tabs"

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsLayout,
})

const settingsTabs = [
  { label: "Categories & Tags", value: "/settings/categories" },
  { label: "Merchant Rules", value: "/settings/merchant-rules" },
  { label: "Household", value: "/settings/household" },
] as const

function SettingsLayout() {
  const { location } = useRouterState()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={location.pathname}
        onValueChange={(value) => navigate({ to: value as string })}
      >
        <TabsList>
          {settingsTabs.map(({ label, value }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  )
}
