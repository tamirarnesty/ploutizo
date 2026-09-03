import { useMutation } from '@tanstack/react-query';
import type { InspectImportResult } from '@ploutizo/types';
import type { InspectImportUploadInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

interface InspectImportResponse {
  data: InspectImportResult;
}

export const useInspectImport = () =>
  useMutation({
    mutationFn: (body: InspectImportUploadInput) =>
      apiFetch<InspectImportResponse>('/api/imports/inspect', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
