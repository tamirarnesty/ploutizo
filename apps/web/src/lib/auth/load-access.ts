import { ensureAccess } from './ensure-access';
import { rememberClientBearer } from './get-bearer-token';
import type { AccessPolicy, AccessState } from './access-policy';

export const loadAccess = async (
  policy: AccessPolicy
): Promise<{ access: AccessState }> => {
  const { access, bearerToken } = await ensureAccess({ data: policy });
  rememberClientBearer(bearerToken);
  return { access };
};
