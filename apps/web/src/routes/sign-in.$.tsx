import { SignIn } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/sign-in/$")({
  component: Page,
})

// Handles both sign-in and sign-up pages
function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  )
}
