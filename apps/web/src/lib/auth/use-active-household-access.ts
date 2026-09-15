import { useRouteContext } from '@tanstack/react-router';
import { requireActiveHousehold } from './require-active-household';
import type { ActiveHouseholdAccess } from './access-policy';

export const useActiveHouseholdAccess = (): ActiveHouseholdAccess => {
  const { access } = useRouteContext({ from: '/_layout' });
  return requireActiveHousehold(access);
};
