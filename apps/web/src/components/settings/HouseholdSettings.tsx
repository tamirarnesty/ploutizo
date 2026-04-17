import { Label } from "@ploutizo/ui/components/label"
import { Separator } from "@ploutizo/ui/components/separator"
import { Text } from "@ploutizo/ui/components/text"
import { HouseholdSettingsForm } from "./HouseholdSettingsForm"
import { HouseholdOverviewSection } from "./HouseholdOverviewSection"
import { MembersSection } from "./MembersSection"

export const HouseholdSettings = () => (
  <div className="flex max-w-2xl flex-col gap-8">

    {/* Section 1: Household Overview (D-04, D-05) */}
    <HouseholdOverviewSection />

    <Separator />

    {/* Section 2: Members + invite form (D-06–D-13) */}
    <MembersSection />

    <Separator />

    {/* Section 3: Settlement Threshold (D-02) */}
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="settlement-threshold" className="text-sm font-medium">
          Settlement reminder threshold
        </Label>
        <Text variant="caption">
          You'll be reminded when the shared balance exceeds this amount.
        </Text>
      </div>
      <HouseholdSettingsForm />
    </section>

  </div>
)
