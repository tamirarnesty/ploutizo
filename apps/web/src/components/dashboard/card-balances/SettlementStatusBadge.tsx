import { Badge } from '@ploutizo/ui/components/reui/badge';
import { Text } from '@ploutizo/ui/components/text';
import { AlertCircle, CircleCheck } from 'lucide-react';
import type { SettlementStatus } from '@ploutizo/types';
import type { LucideIcon } from 'lucide-react';

const SETTLEMENT_STATUS_BADGE = {
  due_soon: {
    label: 'Due Soon',
    variant: 'warning-light' as const,
    Icon: AlertCircle,
  },
  on_track: {
    label: 'On Track',
    variant: 'success-light' as const,
    Icon: CircleCheck,
  },
} as const satisfies Record<
  SettlementStatus,
  {
    label: string;
    variant: 'warning-light' | 'success-light';
    Icon: LucideIcon;
  }
>;

type SettlementStatusBadgeProps = {
  status: SettlementStatus | null;
};

export const settlementStatusDisplayLabel = (
  status: SettlementStatus
): string => SETTLEMENT_STATUS_BADGE[status].label;

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

  const { label, variant, Icon } = SETTLEMENT_STATUS_BADGE[status];

  return (
    <Badge variant={variant} radius="full">
      <Icon data-icon="inline-start" aria-hidden />
      {label}
    </Badge>
  );
};
