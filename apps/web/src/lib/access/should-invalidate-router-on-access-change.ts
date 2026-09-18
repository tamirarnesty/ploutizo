import { accessKey, hasAccessIdentityChanged } from './access-key';
import type { AccessState } from './access-state';

type RouterInvalidationInput = {
  previousAccessKey: string | undefined;
  access: AccessState;
  isReady: boolean;
  routerContextReady: boolean;
};

export const shouldInvalidateRouterOnAccessChange = ({
  previousAccessKey,
  access,
  isReady,
  routerContextReady,
}: RouterInvalidationInput): boolean => {
  const currentAccessKey = accessKey(access);
  const identityChanged = hasAccessIdentityChanged(
    previousAccessKey,
    currentAccessKey
  );
  const readinessBecameReady = !routerContextReady && isReady;

  return identityChanged || readinessBecameReady;
};
