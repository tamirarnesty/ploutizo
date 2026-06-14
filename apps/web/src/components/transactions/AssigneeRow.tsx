import { useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
} from '@ploutizo/utils/currency';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
import { PercentInput } from '@/components/currency/PercentInput';
import { UserAvatar } from '@/components/members/UserAvatar';
import type { AssigneeFormRow } from './types';

interface AssigneeRowProps {
  memberId: string;
  memberName: string | null;
  imageUrl?: string | null;
  amountCents: number;
  percentage: number;
  mode: 'percent' | 'dollar';
  totalCents: number;
  onChange: (
    memberId: string,
    patch: Partial<Pick<AssigneeFormRow, 'amountCents' | 'percentage'>>
  ) => void;
  onRemove: (memberId: string) => void;
}

const percentageFromDollars = (dollars: number, totalCents: number): number =>
  totalCents > 0
    ? Math.round((dollars / centsToDollars(totalCents)) * 1000) / 10
    : 0;

export const AssigneeRow = ({
  memberId,
  memberName,
  imageUrl,
  amountCents,
  percentage,
  mode,
  totalCents,
  onChange,
  onRemove,
}: AssigneeRowProps) => {
  const applyDollarsAsCanonical = useCallback(
    (dollars: number) => {
      const cents = dollarsToCents(dollars);
      const nextPercentage = percentageFromDollars(
        centsToDollars(cents),
        totalCents
      );
      if (cents === amountCents && nextPercentage === percentage) return;

      onChange(memberId, {
        amountCents: cents,
        percentage: nextPercentage,
      });
    },
    [amountCents, memberId, onChange, percentage, totalCents]
  );

  return (
    <div className="flex items-center gap-2">
      <UserAvatar
        size="sm"
        name={memberName ?? 'Unknown member'}
        imageUrl={imageUrl}
      />

      <Text as="span" variant="body-sm" className="min-w-0 flex-1 truncate">
        {memberName ?? 'Unknown'}
      </Text>

      {mode === 'dollar' ? (
        <CurrencyInput
          id={`assignee-amount-${memberId}`}
          className="w-24 shrink-0"
          inputClassName="text-right"
          value={centsToDollars(amountCents)}
          onChange={(dollars) => {
            if (dollars !== undefined) {
              applyDollarsAsCanonical(dollars);
            }
          }}
          commitEmptyAs={0}
        />
      ) : (
        <PercentInput
          id={`assignee-percent-${memberId}`}
          className="w-24 shrink-0"
          inputClassName="text-right"
          value={percentage}
          onChange={(p) => {
            onChange(memberId, {
              percentage: p,
              amountCents: Math.round((p / 100) * totalCents),
            });
          }}
        />
      )}

      <Text
        as="span"
        variant="body-sm"
        className="w-20 text-right text-muted-foreground"
      >
        {mode === 'percent'
          ? formatCurrency(amountCents)
          : `${percentage.toFixed(1)}%`}
      </Text>

      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={`Remove ${memberName ?? 'assignee'}`}
        onClick={() => onRemove(memberId)}
        className="h-8 w-8 shrink-0"
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </div>
  );
};
