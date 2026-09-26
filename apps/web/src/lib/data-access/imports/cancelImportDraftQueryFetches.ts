import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { importDraftQueryKey } from './queryKeys';

/** Stop in-flight draft GETs before collection cleanup or session release. */
export const cancelImportDraftQueryFetches = async (draftId: string) => {
  await getActiveQueryClient().cancelQueries({
    queryKey: importDraftQueryKey(draftId),
  });
};
