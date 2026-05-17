import { Badge } from '@ploutizo/ui/components/badge';
import { cn } from '@ploutizo/ui/lib/utils';
import { AlertCircle, CircleCheck } from 'lucide-react';
import type { SettlementStatus } from '@ploutizo/types';
import type { LucideIcon } from 'lucide-react';

/** Add a key here when extending `SettlementStatus` — TypeScript will enforce exhaustiveness. */
const SETTLEMENT_STATUS_BADGE = {
  due_soon: {
    className:
      'rounded-full border-warning/20 bg-warning/10 font-serif text-warning-foreground',
    Icon: AlertCircle,
  },
  on_track: {
    className:
      'rounded-full border-success/20 bg-success/10 text-success-foreground',
    Icon: CircleCheck,
  },
} as const satisfies Record<
  SettlementStatus,
  { className: string; Icon: LucideIcon }
>;

type SettlementStatusBadgeProps = {
  status: SettlementStatus | null;
};

/** Sketch-style label: underscores → spaces without title-casing hype. */
const statusLabelFromKey = (status: SettlementStatus | null): string | null => {
  if (!status) return null;
  return status.replaceAll('_', ' ');
};

export const SettlementStatusBadge = ({
  status,
}: SettlementStatusBadgeProps) => {
  if (!status) {
    return (
      <span className="text-xs leading-none font-medium text-muted-foreground">
        —
      </span>
    );
  }

  const { className, Icon } = SETTLEMENT_STATUS_BADGE[status];

  const label = statusLabelFromKey(status);

  return (
    <Badge
      variant="outline"
      className={cn(className, 'inline-flex gap-[5px] text-[11px] font-bold')}
    >
      <Icon aria-hidden className="size-[13px] shrink-0 stroke-[1.65]" />
      <span>{label}</span>
    </Badge>
  );
};
