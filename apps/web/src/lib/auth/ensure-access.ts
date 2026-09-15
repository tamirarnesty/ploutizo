import { createServerFn } from '@tanstack/react-start';
import type { AccessPolicy } from './access-policy';

export const ensureAccess = createServerFn({ method: 'GET' })
  .inputValidator((policy: AccessPolicy) => policy)
  .handler(async ({ data: policy }) => {
    const { ensureAccessOnRequest } = await import('./ensure-access.server');
    return ensureAccessOnRequest(policy);
  });
