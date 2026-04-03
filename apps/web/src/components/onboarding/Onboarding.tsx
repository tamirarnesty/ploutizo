import { CreateOrganization } from "@clerk/tanstack-react-start"

export const Onboarding = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-4 px-6">
        <div className="space-y-2">
          <h1 className="font-[--font-heading] text-3xl font-semibold">
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
