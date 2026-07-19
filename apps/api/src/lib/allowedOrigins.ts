const STATIC_ALLOWED_ORIGINS = [
  'https://ploutizo.app',
  'https://www.ploutizo.app',
  'http://localhost:3000',
] as const;

// Railway PR preview web deployments, e.g. web-ploutizo-pr-105.up.railway.app
const RAILWAY_PR_PREVIEW_ORIGIN =
  /^https:\/\/web-ploutizo-pr-\d+\.up\.railway\.app$/;

// Tenant subdomains, e.g. golden-newt.ploutizo.app
const PLOUTIZO_SUBDOMAIN_ORIGIN = /^https:\/\/[a-z0-9-]+\.ploutizo\.app$/;

const parseExtraOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const extraAllowedOrigins = parseExtraOrigins(process.env.CORS_ALLOWED_ORIGINS);

export const isAllowedOrigin = (origin: string): boolean => {
  if ((STATIC_ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
    return true;
  }
  if (extraAllowedOrigins.includes(origin)) {
    return true;
  }
  return (
    RAILWAY_PR_PREVIEW_ORIGIN.test(origin) ||
    PLOUTIZO_SUBDOMAIN_ORIGIN.test(origin)
  );
};

export const isAllowedParty = (azp: string): boolean => isAllowedOrigin(azp);

export const resolveAllowedOrigin = (
  origin: string | undefined
): string | null => {
  if (!origin) return null;
  return isAllowedOrigin(origin) ? origin : null;
};
