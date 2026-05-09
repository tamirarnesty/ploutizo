import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import type { SettlementStatus } from '@ploutizo/types';

/** Add a key here when extending `SettlementStatus` — TypeScript will enforce exhaustiveness. */
const SETTLEMENT_STATUS_BADGE = {
  due_soon: {
    label: 'Due Soon',
    className:
      'rounded-full border-warning/20 bg-warning/10 font-serif text-warning-foreground',
  },
  on_track: {
    label: 'On Track',
    className:
      'rounded-full border-success/20 bg-success/10 text-success-foreground',
  },
} as const satisfies Record<
  SettlementStatus,
  { label: string; className: string }
>;

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

  const { label, className } = SETTLEMENT_STATUS_BADGE[status];

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
};
