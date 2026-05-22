/**
 * Formats an integer cents value as a CAD currency string.
 * Example: formatCurrency(1099) → "CA$10.99" or "$10.99" depending on locale
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(cents / 100);
};

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
