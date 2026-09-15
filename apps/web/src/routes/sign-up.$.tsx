import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/auth/enforce-access';

const Page = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export const Route = createFileRoute('/sign-up/$')({
  beforeLoad: ({ context, location }) => {
    enforceAccessPolicy(context.access, 'guest', location.href);
  },
  component: Page,
});
