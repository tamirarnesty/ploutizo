import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/settings")({
  component: SettingsLayout,
})

function SettingsLayout() {
  return <Outlet />
}
