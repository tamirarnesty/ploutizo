import { Label } from '@ploutizo/ui/components/label';
import { Page } from '@ploutizo/ui/components/page';
import { Text } from '@ploutizo/ui/components/text';
import { PageHeader } from '@/components/PageHeader';
import { HouseholdSettingsForm } from './HouseholdSettingsForm';
import { HouseholdOverviewSection } from './HouseholdOverviewSection';
import { MembersSection } from './MembersSection';

export const HouseholdSettings = () => (
  <Page>
    <PageHeader title="Household" titleAs="h2" />

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <HouseholdOverviewSection />
        <MembersSection />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="settlement-threshold" className="text-sm font-medium">
            Settlement reminder threshold
          </Label>
          <Text variant="caption">
            Choose when card balance reminders start for this household.
          </Text>
        </div>
        <HouseholdSettingsForm />
      </section>
    </div>
  </Page>
);
