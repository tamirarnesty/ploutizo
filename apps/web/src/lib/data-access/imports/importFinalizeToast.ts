import type { ImportOutcomeCounts } from '@ploutizo/types';

export const importFinalizeToastId = (draftId: string) =>
  `import-finalize:${draftId}`;

const transactionLabel = (count: number) =>
  count === 1 ? 'transaction' : 'transactions';

export const importFinalizePendingMessage = (
  counts: ImportOutcomeCounts
): string => {
  if (counts.created > 0) {
    return `Importing ${counts.created} ${transactionLabel(counts.created)}…`;
  }
  if (counts.matched > 0) {
    return `Linking ${counts.matched} matched ${transactionLabel(counts.matched)}…`;
  }
  return 'Finalizing import…';
};
