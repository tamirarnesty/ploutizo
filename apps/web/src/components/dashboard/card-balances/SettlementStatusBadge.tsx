import { Badge } from '@ploutizo/ui/components/reui/badge';
import { Text } from '@ploutizo/ui/components/text';
import { AlertCircle, CircleCheck } from 'lucide-react';
import type { SettlementStatus } from '@ploutizo/validators';
import { settlementStatusDisplayLabel } from '@/components/dashboard/card-balances/settlementStatusDisplayLabel';
import type { LucideIcon } from 'lucide-react';

const SETTLEMENT_STATUS_BADGE = {
  due_soon: {
    variant: 'warning-light' as const,
    Icon: AlertCircle,
  },
  on_track: {
    variant: 'success-light' as const,
    Icon: CircleCheck,
  },
} as const satisfies Record<
  SettlementStatus,
  {
    variant: 'warning-light' | 'success-light';
    Icon: LucideIcon;
  }
>;

type SettlementStatusBadgeProps = {
  status: SettlementStatus | null;
};

export const SettlementStatusBadge = ({
  status,
}: SettlementStatusBadgeProps) => {
  if (!status) {
    return (
      <Text variant="caption" className="leading-none font-medium">
        <span aria-hidden="true">—</span>
        <span className="sr-only">No status</span>
      </Text>
    );
  }

  const { variant, Icon } = SETTLEMENT_STATUS_BADGE[status];

  return (
    <Badge variant={variant} radius="full">
      <Icon data-icon="inline-start" aria-hidden />
      {settlementStatusDisplayLabel(status)}
    </Badge>
  );
};
