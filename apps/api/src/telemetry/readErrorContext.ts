const MAX_CORRELATION_HEADER_LENGTH = 128;

/**
 * Bound untrusted correlation header values before attaching to spans/logs.
 */
export const sanitizeCorrelationHeader = (
  value: string | undefined
): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_CORRELATION_HEADER_LENGTH) {
    return trimmed.slice(0, MAX_CORRELATION_HEADER_LENGTH);
  }
  return trimmed;
};
