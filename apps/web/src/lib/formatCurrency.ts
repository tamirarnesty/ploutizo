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
