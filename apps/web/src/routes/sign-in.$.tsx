import { SignIn } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { AccessPolicyBoundary, sanitizeReturnPath } from '@/lib/access';

const Page = () => {
  const { redirect: returnPath } = Route.useSearch();
  return (
    <AccessPolicyBoundary policy="guest">
      <div className="flex min-h-screen items-center justify-center">
        <SignIn
          fallbackRedirectUrl="/dashboard"
          {...(returnPath ? { forceRedirectUrl: returnPath } : {})}
        />
      </div>
    </AccessPolicyBoundary>
  );
};

export const Route = createFileRoute('/sign-in/$')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeReturnPath(search.redirect);
    return redirect ? { redirect } : {};
  },
  component: Page,
});
