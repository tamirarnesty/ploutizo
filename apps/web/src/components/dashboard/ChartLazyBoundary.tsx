import { Component } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import type { ReactNode } from 'react';

type ChartLazyBoundaryProps = {
  children: ReactNode;
  label: string;
};

type ChartLazyBoundaryState = {
  error: Error | null;
};

/** Catches lazy chart chunk failures so the dashboard card can still render. */
export class ChartLazyBoundary extends Component<
  ChartLazyBoundaryProps,
  ChartLazyBoundaryState
> {
  state: ChartLazyBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ChartLazyBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Text
          variant="body-sm"
          className="flex min-h-56 items-center justify-center text-muted-foreground"
          role="status"
        >
          Couldn't load {this.props.label}. Refresh the page to try again.
        </Text>
      );
    }

    return this.props.children;
  }
}
