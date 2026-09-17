import { SignIn } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router';
import { enforceAccessPolicy, sanitizeReturnPath } from '@/lib/access';

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
  beforeLoad: async ({ context, location }) => {
    await enforceAccessPolicy(context, 'guest', location.href);
  },
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeReturnPath(search.redirect);
    return redirect ? { redirect } : {};
  },
  component: Page,
});
