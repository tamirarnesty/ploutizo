/**
 * Lightweight identifier masking for unstructured logs — not secrecy-grade.
 * Prefer structured logging with policy-defined fields once available.
 */
export const redactIdentifier = (
  id: string | null | undefined
): string => {
  if (!id) return '(none)';
  if (id.length <= 12) return '***';
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
};
