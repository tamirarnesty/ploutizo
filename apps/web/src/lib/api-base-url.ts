import { isLoopbackHostname } from '@/lib/loopback-hostname';

/** Dev-only: when the web app is opened via LAN IP, keep API on the same host. */
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

  const apiHost = configuredUrl.hostname;
  if (!isLoopbackHostname(apiHost)) {
    return configured;
  }

  const pageHost = window.location.hostname;
  if (isLoopbackHostname(pageHost)) {
    return configured;
  }

  configuredUrl.hostname = pageHost;
  return configuredUrl.origin;
};
