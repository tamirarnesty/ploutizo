import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import type { SettlementStatus } from '@ploutizo/types';

type SettlementStatusBadgeProps = {
  status: SettlementStatus | null;
};

export const SettlementStatusBadge = ({
  status,
}: SettlementStatusBadgeProps) => {
  if (!status) {
    return (
      <Text variant="caption" className="text-muted-foreground">
        —
      </Text>
    );
  }

  if (status === 'due_soon') {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-warning/20 bg-warning/10 font-serif text-warning-foreground"
      >
        Due Soon
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="rounded-full border-success/20 bg-success/10 text-success-foreground"
    >
      On Track
    </Badge>
  );
};
