import { isPrivateNetworkIpv4 } from '@ploutizo/utils/private-network-ipv4';
import { isLoopbackHostname } from '@/lib/loopback-hostname';

/**
 * Dev-only. A LAN page at `http://<private-ipv4>:3000` calls the API on that
 * same host, keeping the protocol and port from `VITE_API_URL`. Production
 * and loopback pages keep the configured URL.
 */
export const getApiBaseUrl = (): string => {
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
