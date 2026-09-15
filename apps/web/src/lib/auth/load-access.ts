import { createIsomorphicFn } from '@tanstack/react-start';
import { ensureAccess } from './ensure-access';
import { rememberClientBearer } from './get-bearer-token';
import type { AccessPolicy, AccessState } from './access-policy';

export const loadAccessOnClient = async (
  policy: AccessPolicy
): Promise<{ access: AccessState }> => {
  const { access, bearerToken } = await ensureAccess({ data: policy });
  rememberClientBearer(bearerToken);
  return { access };
};

export const loadAccess = createIsomorphicFn()
  .server(async (policy: AccessPolicy): Promise<{ access: AccessState }> => {
    const { ensureAccessOnRequest } = await import('./ensure-access.server');
    const { access } = await ensureAccessOnRequest(policy);
    return { access };
  })
  .client(loadAccessOnClient);
