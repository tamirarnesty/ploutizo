import { createIsomorphicFn } from '@tanstack/react-start';
import { cookieValueFrom } from './cookie-value';
import { getRequestCookie } from './request-cookie.server';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Readable on the server too, so the first render already uses the viewer's preference. */
export const readCookie = createIsomorphicFn()
  .client((name: string) => cookieValueFrom(document.cookie, name))
  .server((name: string) => getRequestCookie(name));

/** `value` must need no cookie encoding, so it reads back the same however many times it is decoded. */
export const writeCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
};
