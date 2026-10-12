import { Component } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { ReactNode } from 'react';

type ChartLazyBoundaryProps = {
  children: ReactNode;
  label: string;
};

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

type ChartLazyBoundaryState = {
  error: Error | null;
  retryKey: number;
};

/** Catches lazy chart chunk failures so the dashboard card can still render. */
export class ChartLazyBoundary extends Component<
  ChartLazyBoundaryProps,
  ChartLazyBoundaryState
> {
  state: ChartLazyBoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(
    error: Error
  ): Partial<ChartLazyBoundaryState> {
    return { error };
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      error: null,
      retryKey: prev.retryKey + 1,
    }));
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

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
