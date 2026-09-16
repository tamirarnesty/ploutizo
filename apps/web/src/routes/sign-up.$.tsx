import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { enforceAccess } from '@/lib/access';

const Page = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export const Route = createFileRoute('/sign-up/$')({
  beforeLoad: ({ context, location }) => {
    enforceAccess(context.access, 'guest', location.href);
  },
  component: Page,
});
