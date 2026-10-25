import { isPrivateNetworkIpv4 } from '@ploutizo/utils/private-network-ipv4';

const STATIC_ALLOWED_ORIGINS = [
  'https://ploutizo.app',
  'https://www.ploutizo.app',
  'http://localhost:3000',
] as const;

/** Local dev at the loopback IP. Production keeps the static list only. */
const LOOPBACK_DEV_ORIGIN = 'http://127.0.0.1:3000';

// Railway PR preview web deployments, e.g. web-ploutizo-pr-105.up.railway.app
const RAILWAY_PR_PREVIEW_ORIGIN =
  /^https:\/\/web-ploutizo-pr-\d+\.up\.railway\.app$/;

const LAN_DEV_WEB_PORT = '3000';

const DOTTED_IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const parseWebOrigin = (origin: string): URL | null => {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  const host = origin.slice(url.protocol.length + 2).split(/[/:]/)[0];
  // 127.1, decimal, and octal forms parse as 127.0.0.1. They must not inherit that entry.
  if (DOTTED_IPV4.test(url.hostname) && host !== url.hostname) {
    return null;
  }
  return url;
};

const parseExtraOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .flatMap((origin) => {
      const url = parseWebOrigin(origin);
      return url ? [url.origin] : [];
    });
};

const extraAllowedOrigins = parseExtraOrigins(process.env.CORS_ALLOWED_ORIGINS);

/** `apps/api` `dev:host` sets this. Production and `pnpm dev` leave it unset. */
const lanDevOriginsEnabled = (): boolean =>
  process.env.ALLOW_LAN_DEV_ORIGINS === '1' &&
  process.env.NODE_ENV !== 'production';

/** `pnpm dev:host`: `http://<private-ipv4>:3000` only. */
const isLanDevWebOrigin = (url: URL): boolean => {
  if (!lanDevOriginsEnabled()) {
    return false;
  }
  if (url.protocol !== 'http:') {
    return false;
  }
  if ((url.port || '80') !== LAN_DEV_WEB_PORT) {
    return false;
  }
  return isPrivateNetworkIpv4(url.hostname);
};

const matchesAllowedOrigin = (url: URL): boolean => {
  const normalized = url.origin;
  if ((STATIC_ALLOWED_ORIGINS as readonly string[]).includes(normalized)) {
    return true;
  }
  if (
    normalized === LOOPBACK_DEV_ORIGIN &&
    process.env.NODE_ENV !== 'production'
  ) {
    return true;
  }
  if (extraAllowedOrigins.includes(normalized)) {
    return true;
  }
  if (isLanDevWebOrigin(url)) {
    return true;
  }
  return RAILWAY_PR_PREVIEW_ORIGIN.test(normalized);
};

export const isAllowedOrigin = (origin: string): boolean => {
  const url = parseWebOrigin(origin);
  return url !== null && matchesAllowedOrigin(url);
};

export const isAllowedParty = (azp: string): boolean => isAllowedOrigin(azp);

export const resolveAllowedOrigin = (
  origin: string | undefined
): string | null => {
  if (!origin) return null;
  const url = parseWebOrigin(origin);
  if (!url || !matchesAllowedOrigin(url)) return null;
  return url.origin;
};
