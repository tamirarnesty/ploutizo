import { isPrivateNetworkIpv4 } from '@ploutizo/utils/private-network-ipv4';
import { isLoopbackHostname } from '@/lib/loopback-hostname';

/** Matches `apps/api` `RAILWAY_PR_PREVIEW_ORIGIN` and the PR environment name. */
const RAILWAY_PR_WEB_HOST = /^web-ploutizo-pr-(\d+)\.up\.railway\.app$/;
const RAILWAY_PR_ENVIRONMENT = /^ploutizo-pr-(\d+)$/;

const previewApiOrigin = (prNumber: string): string =>
  `https://api-ploutizo-pr-${prNumber}.up.railway.app`;

const pageHostname = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.location.hostname;
};

const railwayEnvironmentName = (): string | undefined => {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.RAILWAY_ENVIRONMENT_NAME;
};

/**
 * A Railway PR preview calls that environment's API. The page host wins.
 * SSR, which has no page host, uses `RAILWAY_ENVIRONMENT_NAME`.
 */
const railwayPreviewApiOrigin = (): string | null => {
  const hostMatch = RAILWAY_PR_WEB_HOST.exec(pageHostname() ?? '');
  if (hostMatch?.[1]) return previewApiOrigin(hostMatch[1]);

  if (pageHostname() != null) return null;

  const environmentMatch = RAILWAY_PR_ENVIRONMENT.exec(
    railwayEnvironmentName() ?? ''
  );
  return environmentMatch?.[1] ? previewApiOrigin(environmentMatch[1]) : null;
};

/**
 * Dev-only. A LAN page at `http://<private-ipv4>:3000` calls the API on that
 * same host, keeping the protocol and port from `VITE_API_URL`. Production
 * and loopback pages keep the configured URL.
 */
export const getApiBaseUrl = (): string => {
  const preview = railwayPreviewApiOrigin();
  if (preview) return preview;

  const configured = import.meta.env.VITE_API_URL as string;
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return configured;
  }

  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configured);
  } catch {
    return configured;
  }

  if (!isLoopbackHostname(configuredUrl.hostname)) {
    return configured;
  }

  const pageHost = window.location.hostname;
  if (!isPrivateNetworkIpv4(pageHost)) {
    return configured;
  }

  configuredUrl.hostname = pageHost;
  return configuredUrl.origin;
};
