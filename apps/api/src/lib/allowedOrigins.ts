import { isPrivateNetworkIpv4 } from '@ploutizo/utils/private-network-ipv4';

const STATIC_ALLOWED_ORIGINS = [
  'https://ploutizo.app',
  'https://www.ploutizo.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
] as const;

// Railway PR preview web deployments, e.g. web-ploutizo-pr-105.up.railway.app
const RAILWAY_PR_PREVIEW_ORIGIN =
  /^https:\/\/web-ploutizo-pr-\d+\.up\.railway\.app$/;

const LAN_DEV_WEB_PORT = '3000';

const parseExtraOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const extraAllowedOrigins = parseExtraOrigins(process.env.CORS_ALLOWED_ORIGINS);

const normalizeWebOrigin = (origin: string): string => {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, '');
  }
};

/** `apps/api` `dev:host` sets this. Production and `pnpm dev` leave it unset. */
const lanDevOriginsEnabled = (): boolean =>
  process.env.ALLOW_LAN_DEV_ORIGINS === '1' &&
  process.env.NODE_ENV !== 'production';

/** `pnpm dev:host`: `http://<private-ipv4>:3000` only. */
const isLanDevWebOrigin = (origin: string): boolean => {
  if (!lanDevOriginsEnabled()) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
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

export const isAllowedOrigin = (origin: string): boolean => {
  const normalized = normalizeWebOrigin(origin);
  if ((STATIC_ALLOWED_ORIGINS as readonly string[]).includes(normalized)) {
    return true;
  }
  if (
    extraAllowedOrigins.some(
      (allowed) => normalizeWebOrigin(allowed) === normalized
    )
  ) {
    return true;
  }
  if (isLanDevWebOrigin(normalized)) {
    return true;
  }
  return RAILWAY_PR_PREVIEW_ORIGIN.test(normalized);
};

export const isAllowedParty = (azp: string): boolean => isAllowedOrigin(azp);

export const resolveAllowedOrigin = (
  origin: string | undefined
): string | null => {
  if (!origin) return null;
  const normalized = normalizeWebOrigin(origin);
  return isAllowedOrigin(normalized) ? normalized : null;
};
