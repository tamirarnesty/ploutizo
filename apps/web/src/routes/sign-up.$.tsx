import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { AccessPolicyBoundary } from '@/lib/access';

const Page = () => (
  <AccessPolicyBoundary policy="guest">
    <div className="flex min-h-screen items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  </AccessPolicyBoundary>
);

export const Route = createFileRoute('/sign-up/$')({
  component: Page,
});
