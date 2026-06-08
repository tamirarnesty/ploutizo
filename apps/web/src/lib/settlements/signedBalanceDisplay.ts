import { formatCurrency } from '@ploutizo/utils/currency';

export type SignedBalanceTone = 'credit' | 'owed' | 'zero';

/** Signed balance display for settlement surfaces (chips, menus, dialog). */
export const formatSignedBalanceCents = (
  cents: number
): { text: string; tone: SignedBalanceTone } => {
  if (cents === 0) {
    return { text: formatCurrency(0), tone: 'zero' };
  }
  if (cents < 0) {
    return { text: formatCurrency(cents), tone: 'credit' };
  }
  return { text: formatCurrency(cents), tone: 'owed' };
};

export const signedBalanceToneClassName = (tone: SignedBalanceTone): string => {
  if (tone === 'credit') return 'text-success';
  if (tone === 'zero') return 'text-muted-foreground';
  return 'text-foreground';
};
