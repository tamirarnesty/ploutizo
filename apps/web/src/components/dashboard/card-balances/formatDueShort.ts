/** Short date for statement due column (en-CA locale). */
export const formatDueShort = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
};
