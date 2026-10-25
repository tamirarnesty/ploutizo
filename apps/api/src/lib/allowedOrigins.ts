const STATIC_ALLOWED_ORIGINS = [
  'https://ploutizo.app',
  'https://www.ploutizo.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
] as const;

// Railway PR preview web deployments, e.g. web-ploutizo-pr-105.up.railway.app
const RAILWAY_PR_PREVIEW_ORIGIN =
  /^https:\/\/web-ploutizo-pr-\d+\.up\.railway\.app$/;

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

/** Laptop `pnpm dev` — not production/preview deploys. */
const isLocalDeveloperDeployment = (): boolean => {
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();
  if (appEnv === 'local') {
    return true;
  }
  if (appEnv === 'production' || appEnv === 'preview') {
    return false;
  }
  return true;
};

const isPrivateNetworkIpv4 = (hostname: string): boolean => {
  if (hostname.startsWith('10.')) {
    return true;
  }
  if (hostname.startsWith('192.168.')) {
    return true;
  }
  const octets = hostname.match(/^172\.(\d+)\./);
  if (!octets) {
    return false;
  }
  const secondOctet = Number(octets[1]);
  return secondOctet >= 16 && secondOctet <= 31;
};

/** `pnpm dev:host`: allow http://<lan-ip>:3000 on local developer machines. */
const isLocalAreaNetworkDevWebOrigin = (origin: string): boolean => {
  if (!isLocalDeveloperDeployment()) {
    return false;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:') {
      return false;
    }
    const port = url.port || '80';
    if (port !== '3000') {
      return false;
    }
    return isPrivateNetworkIpv4(url.hostname);
  } catch {
    return false;
  }
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
  if (isLocalAreaNetworkDevWebOrigin(normalized)) {
    return true;
  }
  return RAILWAY_PR_PREVIEW_ORIGIN.test(normalized);
};

export const isAllowedParty = (azp: string): boolean =>
  isAllowedOrigin(normalizeWebOrigin(azp));

export const resolveAllowedOrigin = (
  origin: string | undefined
): string | null => {
  if (!origin) return null;
  const normalized = normalizeWebOrigin(origin);
  return isAllowedOrigin(normalized) ? normalized : null;
};
