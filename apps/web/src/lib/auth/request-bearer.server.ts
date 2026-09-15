import { getRequest } from '@tanstack/react-start/server';

const requestBearers = new WeakMap<Request, string | null>();

export const bindRequestBearer = (token: string | null) => {
  requestBearers.set(getRequest(), token);
};

export const getRequestBearer = (): string | null => {
  try {
    const request = getRequest();
    if (requestBearers.has(request)) {
      return requestBearers.get(request) ?? null;
    }
  } catch {
    return null;
  }
  return null;
};
