import type { ImportHistoryItem, ImportHistoryPage } from '@ploutizo/types';
import { DomainError } from '@/lib/errors';
import {
  decodeImportHistoryCursor,
  encodeImportHistoryCursor,
} from '@/lib/import-history-cursor';
import { listImportHistoryPage } from '@/lib/queries/imports';
import { toImportHistoryItem } from '@/services/import-batch-mappers';

export {
  toImportCompletedHistoryItem,
  toImportCompletedResult,
} from '@/services/import-batch-mappers';

const historyClosedAt = (item: ImportHistoryItem) =>
  new Date(item.status === 'completed' ? item.completedAt : item.discardedAt);

export const listImportHistory = async (
  orgId: string,
  input: { cursor?: string; limit?: number } = {}
): Promise<ImportHistoryPage> => {
  const limit = input.limit ?? 10;
  let cursor: { closedAt: string; id: string } | undefined;
  if (input.cursor) {
    const decoded = decodeImportHistoryCursor(input.cursor);
    if (!decoded) {
      throw new DomainError(400, 'Invalid history cursor.', 'INVALID_CURSOR');
    }
    cursor = decoded;
  }

  const rows = await listImportHistoryPage(orgId, { limit, cursor });
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const data = pageRows.map(toImportHistoryItem);
  const last = data.at(-1);
  return {
    data,
    nextCursor:
      hasMore && last
        ? encodeImportHistoryCursor(historyClosedAt(last), last.id)
        : null,
  };
};
