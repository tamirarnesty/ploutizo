import { createFileRoute } from '@tanstack/react-router';
import { AccessPolicyBoundary } from '@/lib/access';
import { Onboarding } from '../components/onboarding/Onboarding';

const Page = () => (
  <AccessPolicyBoundary policy="signed-in">
    <Onboarding />
  </AccessPolicyBoundary>
);

export const Route = createFileRoute('/onboarding')({
  component: Page,
});
