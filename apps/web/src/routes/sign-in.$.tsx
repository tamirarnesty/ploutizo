import { SignIn } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { loadAccess } from '@/lib/auth/load-access';

// Handles both sign-in and sign-up pages
const Page = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
};

export const Route = createFileRoute('/sign-in/$')({
  beforeLoad: () => loadAccess('guest'),
  component: Page,
});
