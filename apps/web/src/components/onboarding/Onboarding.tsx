import { CreateOrganization } from '@clerk/tanstack-react-start';
import { Text } from '@ploutizo/ui/components/text';

export const Onboarding = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto w-full max-w-md space-y-4 px-6">
        <div className="space-y-2">
          <Text as="h1" variant="h1">
            Create your household
          </Text>
          <Text variant="body-sm" className="text-muted-foreground">
            A household groups your accounts and members together.
          </Text>
        </div>
        <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
      </div>
    </div>
  );
};
