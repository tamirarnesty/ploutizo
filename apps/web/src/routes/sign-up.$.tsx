import { SignUp } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';

const Page = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export const Route = createFileRoute('/sign-up/$')({
  component: Page,
});
