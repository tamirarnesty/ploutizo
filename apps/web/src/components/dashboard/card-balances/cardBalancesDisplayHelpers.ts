/** First token of display name — sufficient for compact owner column with avatar. */
export const toFirstName = (displayName: string): string => {
  const trimmed = displayName.trim();
  if (!trimmed) return trimmed;
  const space = trimmed.indexOf(' ');
  return space === -1 ? trimmed : trimmed.slice(0, space);
};
