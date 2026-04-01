import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold font-[--font-heading] mb-4">
        Dashboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Your financial overview will appear here once you&apos;ve added accounts
        and transactions.
      </p>
    </div>
  )
}
