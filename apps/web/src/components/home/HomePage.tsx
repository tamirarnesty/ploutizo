import { Link } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';

export const HomePage = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex max-w-lg flex-col items-center gap-3 text-center">
        <Text as="h1" variant="h2">
          ploutizo
        </Text>
        <Text variant="body-sm" className="text-balance text-muted-foreground">
          Household finance, shared. A proper home page is coming soon.
        </Text>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link to="/sign-in/$" />}
        >
          Sign in
        </Button>
        <Button nativeButton={false} render={<Link to="/sign-up/$" />}>
          Get started
        </Button>
      </div>
    </div>
  );
};
