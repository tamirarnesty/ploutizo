import { Spinner } from '@ploutizo/ui/components/spinner';

/** Suspense fallback for lazy dashboard charts (min height matches chart slot). */
export const ChartLazyFallback = () => (
  <div className="relative flex h-full min-h-56 w-full items-center justify-center">
    <span className="sr-only">Loading chart</span>
    <Spinner className="size-6 text-muted-foreground" aria-hidden />
  </div>
);
