import { Component, Suspense, lazy, useMemo, useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { ChartLazyFallback } from '@/components/dashboard/ChartLazyFallback';
import type { ComponentType, ReactNode } from 'react';

export type ChartLazyErrorFallbackProps = {
  label: string;
  onRetry: () => void;
};

export const ChartLazyErrorFallback = ({
  label,
  onRetry,
}: ChartLazyErrorFallbackProps) => (
  <div
    className="flex min-h-56 flex-col items-center justify-center gap-3 text-center"
    role="status"
  >
    <Text variant="body-sm" className="text-muted-foreground">
      Couldn't load {label}.
    </Text>
    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      Try again
    </Button>
  </div>
);

type ChartLazyErrorBoundaryProps = {
  label: string;
  onRetry: () => void;
  children: ReactNode;
};

type ChartLazyErrorBoundaryState = {
  error: Error | null;
};

/** Catches lazy chart chunk failures so the dashboard card can still render. */
class ChartLazyErrorBoundary extends Component<
  ChartLazyErrorBoundaryProps,
  ChartLazyErrorBoundaryState
> {
  state: ChartLazyErrorBoundaryState = { error: null };

  static getDerivedStateFromError(
    error: Error
  ): Partial<ChartLazyErrorBoundaryState> {
    return { error };
  }

  private handleRetry = () => {
    this.setState({ error: null });
    this.props.onRetry();
  };

  render() {
    if (this.state.error) {
      return (
        <ChartLazyErrorFallback
          label={this.props.label}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export type ChartLazyBoundaryProps<TChartProps extends object> = {
  label: string;
  load: () => Promise<{ default: ComponentType<TChartProps> }>;
  fallback?: ReactNode;
  children: (Chart: ComponentType<TChartProps>) => ReactNode;
};

/**
 * Lazy-loads a chart chunk behind Suspense and an error boundary. Retries recreate
 * `lazy()` so a previously rejected dynamic import can load after recovery.
 */
export const ChartLazyBoundary = <TChartProps extends object>({
  label,
  load,
  fallback,
  children,
}: ChartLazyBoundaryProps<TChartProps>) => {
  const [loadAttempt, setLoadAttempt] = useState(0);
  const LazyChart = useMemo(() => lazy(load), [load, loadAttempt]);

  const handleRetry = () => {
    setLoadAttempt((attempt) => attempt + 1);
  };

  return (
    <ChartLazyErrorBoundary label={label} onRetry={handleRetry}>
      <Suspense fallback={fallback ?? <ChartLazyFallback />}>
        {children(LazyChart)}
      </Suspense>
    </ChartLazyErrorBoundary>
  );
};
