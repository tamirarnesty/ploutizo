import { useQuery } from '@tanstack/react-query';
import type { ImportDraft } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const importDraftQueryKey = (id: string | null) =>
  ['imports', 'draft', id] as const;

export const fetchImportDraft = async (id: string): Promise<ImportDraft> => {
  const r = await apiFetch<{ data: ImportDraft }>(`/api/imports/drafts/${id}`);
  return r.data;
};

export const useGetImportDraft = (
  id: string | null
): UseQueryResult<ImportDraft> =>
  useQuery({
    queryKey: importDraftQueryKey(id),
    queryFn: () => fetchImportDraft(id ?? ''),
    enabled: id !== null,
  });
