import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { Tabs, TabsList, TabsTrigger } from "@ploutizo/ui/components/tabs"
import { Text } from "@ploutizo/ui/components/text"

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsLayout,
  beforeLoad: ({ location }) => {
    if (
      location.pathname === "/settings" ||
      location.pathname === "/settings/"
    ) {
      throw redirect({ to: "/settings/categories" })
    }
  },
})

const settingsTabs = [
  { label: "Categories & Tags", value: "/settings/categories" },
  { label: "Merchant Rules", value: "/settings/merchant-rules" },
  { label: "Household", value: "/settings/household" },
] as const

function SettingsLayout() {
  const { location } = useRouterState()
  const navigate = useNavigate()

  // Match by prefix so sub-routes (e.g. Clerk-pushed paths under /settings/household/*)
  // keep the correct tab highlighted. Falls back to exact match when no prefix matches.
  const activeTabValue =
    settingsTabs.find((tab) => location.pathname.startsWith(tab.value))
      ?.value ?? location.pathname

  return (
    <div className="flex flex-col gap-6">
      <Text as="h1" variant="h3">Settings</Text>
      <Tabs
        value={activeTabValue}
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
