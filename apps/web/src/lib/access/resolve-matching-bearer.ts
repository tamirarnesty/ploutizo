import { claimsMatchAccess } from './bearer-claims';
import type { AccessState } from './access-state';

type BearerGetter = (options?: {
  skipCache?: boolean;
}) => Promise<string | null>;

export const resolveMatchingBearer = async (
  getToken: BearerGetter,
  access: AccessState
): Promise<string | null> => {
  if (access.status === 'signed-out') {
    return null;
  }
  for (const options of [undefined, { skipCache: true }]) {
    const token = await getToken(options);
    if (token && claimsMatchAccess(token, access)) {
      return token;
    }
  }
  return null;
};
