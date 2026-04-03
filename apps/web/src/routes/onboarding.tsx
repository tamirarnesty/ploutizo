import { CreateOrganization } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto px-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold font-[--font-heading]">
            Create your household
          </h1>
          <p className="text-sm text-muted-foreground">
            A household groups your accounts and members together.
          </p>
        </div>
        <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
      </div>
    </div>
  )
}
