import { householdQueryKey } from '@/lib/auth/household-query-key';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';

export const importTargetsQueryKey = (access: ActiveHouseholdAccess) =>
  householdQueryKey(access, 'imports', 'targets');

export const activeImportDraftsQueryKey = (access: ActiveHouseholdAccess) =>
  householdQueryKey(access, 'imports', 'drafts');

export const importHistoryQueryKey = (access: ActiveHouseholdAccess) =>
  householdQueryKey(access, 'imports', 'history');

export const importHistoryPageQueryKey = (
  access: ActiveHouseholdAccess,
  limit: number
) => householdQueryKey(access, 'imports', 'history', 'page', limit);

export const importHistoryInfiniteQueryKey = (
  access: ActiveHouseholdAccess,
  limit: number
) => householdQueryKey(access, 'imports', 'history', 'infinite', limit);

export const importDraftQueryKey = (
  access: ActiveHouseholdAccess,
  id: string | null
) => householdQueryKey(access, 'imports', 'draft', id);

export const importPreparedQueryKey = (
  access: ActiveHouseholdAccess,
  id: string
) => householdQueryKey(access, 'imports', 'prepared', id);
