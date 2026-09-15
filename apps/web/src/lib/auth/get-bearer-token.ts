import { createIsomorphicFn } from '@tanstack/react-start';

let clientBearer: string | null = null;
let clientBearerGetter: (() => Promise<string | null>) | null = null;

export const rememberClientBearer = (token: string | null) => {
  clientBearer = token;
};

export const setClientBearerGetter = (
  getter: (() => Promise<string | null>) | null
) => {
  clientBearerGetter = getter;
};

export const resetClientBearerForTests = () => {
  clientBearer = null;
  clientBearerGetter = null;
};

const getClientBearer = async (): Promise<string | null> => {
  if (clientBearerGetter) {
    const token = await clientBearerGetter();
    if (token) {
      return token;
    }
  }
  return clientBearer;
};

export const getClientBearerForTests = getClientBearer;

export const getBearerToken = createIsomorphicFn()
  .client(getClientBearer)
  .server(async () => {
    const { getRequestBearer } = await import('./request-bearer.server');
    return getRequestBearer();
  });
