import { toast } from '@ploutizo/ui/components/sonner-api';
import type { ImportRequirementFailure } from '@ploutizo/types';
import { summarizeImportRequirementIssues } from '@/lib/data-access/imports/importRequirementIssues';

export const presentImportRequirementIssues = (
  failures: readonly ImportRequirementFailure[]
) => {
  if (failures.length === 0) return;
  toast.error(summarizeImportRequirementIssues(failures));
};
