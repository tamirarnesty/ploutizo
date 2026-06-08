const CURRENCY_INPUT_PATTERN =
  /^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/;

export const formatCurrency = (
  cents: number,
  currency = 'CAD',
  locale = 'en-CA'
): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);

export const parseCurrencyInput = (value: string): number => {
  const compact = value.trim().replace(/\s/g, '').replace(/\$/g, '');

  if (!CURRENCY_INPUT_PATTERN.test(compact)) {
    throw new Error('Invalid currency input');
  }

  const isNegative = compact.startsWith('-');
  const unsigned = compact.replace(/^[+-]/, '');
  const [rawWholePart, rawFractionPart = ''] = unsigned.split('.');
  const wholePart = rawWholePart === '' ? '0' : rawWholePart.replace(/,/g, '');
  const wholeCents = Number.parseInt(wholePart, 10) * 100;
  const centPart = rawFractionPart.padEnd(2, '0').slice(0, 2);
  const cents = Number.parseInt(centPart, 10);
  const roundDigit =
    rawFractionPart.length > 2
      ? Number.parseInt(rawFractionPart[2] ?? '0', 10)
      : 0;
  const roundedCents = wholeCents + cents + (roundDigit >= 5 ? 1 : 0);

  if (roundedCents === 0) return 0;
  return isNegative ? -roundedCents : roundedCents;
};
