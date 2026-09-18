import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/access/enforce-access-policy';

const Page = () => (
  <div className="flex min-h-screen items-center justify-center">
    <SignUp fallbackRedirectUrl="/dashboard" />
  </div>
);

export const Route = createFileRoute('/sign-up/$')({
  beforeLoad: async ({ context, location }) => {
    await enforceAccessPolicy(context, 'guest', location.href);
  },
  component: Page,
});
