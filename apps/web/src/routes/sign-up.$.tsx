import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/access';

const Page = () => (
  <div className="flex min-h-screen items-center justify-center">
    <SignUp fallbackRedirectUrl="/dashboard" />
  </div>
);

export const Route = createFileRoute('/sign-up/$')({
  beforeLoad: ({ context, location }) => {
    enforceAccessPolicy(context, 'guest', location.href);
  },
  component: Page,
});
