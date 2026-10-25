import { cookieValueFrom } from './cookie-value';
import { getRequestCookie } from './request-cookie.server';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** SSR reads request cookies; the browser reads `document.cookie` (no Start RPC). */
export const readCookieValue = (name: string): string | undefined =>
  import.meta.env.SSR
    ? getRequestCookie(name)
    : cookieValueFrom(document.cookie, name);

/** `value` must need no cookie encoding, so it reads back the same however many times it is decoded. */
export const writeCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
};
