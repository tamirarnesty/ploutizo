import type { AccessState } from '@/lib/access/access-state';
import { isHouseholdBearerReady } from '@/lib/access/household-loader-ready';

export const isHouseholdQueryBearerReady = (
  isReady: boolean,
  access: AccessState
): boolean => isHouseholdBearerReady(isReady, access);
