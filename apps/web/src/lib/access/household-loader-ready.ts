import type { RouterContext } from '@/router';

export const isHouseholdLoaderReady = (context: RouterContext) =>
  context.isReady &&
  context.access.status === 'signed-in-with-active-household';
