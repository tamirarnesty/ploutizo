import { Text } from '@ploutizo/ui/components/text';

type DashboardCardErrorProps = {
  message: string;
};

/** Muted per-card failure copy. Recovery is the single header Refresh. */
export const DashboardCardError = ({ message }: DashboardCardErrorProps) => (
  <div className="px-3.5 py-6">
    <Text variant="caption" role="status">
      {message}
    </Text>
  </div>
);
