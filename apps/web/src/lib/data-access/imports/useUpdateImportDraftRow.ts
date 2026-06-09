import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

export const useUpdateImportDraftRow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowId,
      body,
    }: {
      rowId: string;
      body: UpdateImportDraftRowInput;
    }) =>
      apiFetch<{ data: ImportDraftRow }>(`/api/imports/rows/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['imports', 'draft'] });
      void qc.invalidateQueries({ queryKey: ['imports', 'drafts'] });
    },
  });
};
