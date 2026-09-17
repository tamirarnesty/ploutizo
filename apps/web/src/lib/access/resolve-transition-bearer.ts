import { claimsMatchAccess } from './bearer-claims';
import type { AccessState } from './access-state';

type BearerGetter = (options?: {
  skipCache?: boolean;
}) => Promise<string | null>;

export const resolveTransitionBearer = async (
  getToken: BearerGetter,
  access: AccessState
): Promise<string | null> => {
  if (access.status === 'signed-out') {
    return null;
  }
  const token = await getToken({ skipCache: true });
  if (!token || !claimsMatchAccess(token, access)) {
    return null;
  }
  return token;
};
