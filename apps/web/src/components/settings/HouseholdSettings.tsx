import { OrganizationProfile } from "@clerk/tanstack-react-start"
import { Label } from "@ploutizo/ui/components/label"
import { HouseholdSettingsForm } from "./HouseholdSettingsForm"

export const HouseholdSettings = () => (
  <div className="flex max-w-2xl flex-col gap-8">
    <h1 className="font-heading text-xl font-semibold">Household</h1>

    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="settlement-threshold" className="text-sm font-medium">
          Settlement reminder threshold
        </Label>
        <p className="text-xs text-muted-foreground">
          You&apos;ll be reminded when the shared balance exceeds this amount.
        </p>
      </div>
      <HouseholdSettingsForm />
    </section>

    <section className="flex flex-col gap-3">
      <OrganizationProfile />
    </section>
  </div>
)
