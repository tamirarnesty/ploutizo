import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import {
  formatSignedBalanceCents,
  signedBalanceToneClassName,
} from '@/lib/formatCurrency';
import type { ComponentProps } from 'react';

type SignedBalanceTextProps = {
  cents: number;
  zeroDisplay?: 'currency' | 'dash';
  className?: string;
} & Pick<ComponentProps<typeof Text>, 'as' | 'variant'>;

export const SignedBalanceText = ({
  cents,
  zeroDisplay = 'currency',
  className,
  as = 'span',
  variant,
}: SignedBalanceTextProps) => {
  const display = formatSignedBalanceCents(cents);
  const text =
    display.tone === 'zero' && zeroDisplay === 'dash' ? '—' : display.text;

  return (
    <Text
      as={as}
      variant={variant}
      className={cn(
        'whitespace-nowrap tabular-nums',
        signedBalanceToneClassName(display.tone),
        className
      )}
    >
      {text}
    </Text>
  );
};
