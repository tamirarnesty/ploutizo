import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group';
import { Text } from '@ploutizo/ui/components/text';
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
} from '@ploutizo/utils/currency';
import { CurrencyInput } from '@/components/currency/CurrencyInput';
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
  const [percentDisplay, setPercentDisplay] = useState(percentage.toFixed(1));
  const isPercentFocusedRef = useRef(false);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    const modeChanged = prevModeRef.current !== mode;
    prevModeRef.current = mode;
    if (mode === 'percent' && (modeChanged || !isPercentFocusedRef.current)) {
      setPercentDisplay(percentage.toFixed(1));
    }
  }, [mode, percentage]);

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
          className="w-24 shrink-0"
          inputClassName="text-right"
          value={centsToDollars(amountCents)}
          onChange={(dollars) => {
            const cents = dollars === undefined ? 0 : dollarsToCents(dollars);
            onChange(memberId, {
              amountCents: cents,
              percentage:
                totalCents > 0
                  ? Math.round((cents / totalCents) * 1000) / 10
                  : 0,
            });
          }}
        />
      ) : (
        <InputGroup className="w-24 shrink-0">
          <InputGroupAddon align="inline-start">%</InputGroupAddon>
          <InputGroupInput
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="text-right"
            value={percentDisplay}
            onFocus={() => {
              isPercentFocusedRef.current = true;
            }}
            onBlur={() => {
              isPercentFocusedRef.current = false;
              setPercentDisplay(percentage.toFixed(1));
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setPercentDisplay(raw);
              const p = parseFloat(raw);
              if (!isNaN(p)) {
                onChange(memberId, {
                  percentage: p,
                  amountCents: Math.round((p / 100) * totalCents),
                });
              }
            }}
          />
        </InputGroup>
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
