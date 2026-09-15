import { SignIn } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy } from '@/lib/auth/enforce-access';
import { sanitizeReturnPath } from '@/lib/auth/access-policy';

const Page = () => {
  const { redirect: returnPath } = Route.useSearch();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        {...(returnPath ? { forceRedirectUrl: returnPath } : {})}
      />
    </div>
  );
};

export const Route = createFileRoute('/sign-in/$')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeReturnPath(search.redirect);
    return redirect ? { redirect } : {};
  },
  beforeLoad: ({ context, location }) => {
    enforceAccessPolicy(context.access, 'guest', location.href);
  },
  component: Page,
});
