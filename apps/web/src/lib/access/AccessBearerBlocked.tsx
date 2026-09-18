import { Button } from '@ploutizo/ui/components/button';

type AccessBearerBlockedProps = {
  onRetry: () => void;
};

export const AccessBearerBlocked = ({ onRetry }: AccessBearerBlockedProps) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">
        Couldn&apos;t verify your session
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your household session is out of date. Retry to refresh your
        credentials, or sign out and back in if this keeps happening.
      </p>
    </div>
    <Button type="button" onClick={onRetry}>
      Retry
    </Button>
  </div>
);
