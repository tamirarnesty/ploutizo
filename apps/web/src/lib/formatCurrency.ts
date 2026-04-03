/**
 * Formats an integer cents value as a USD currency string.
 * Example: formatCurrency(1099) → "$10.99"
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}
