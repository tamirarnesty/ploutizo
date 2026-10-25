import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('rewrites localhost API host to the page host in dev', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
    vi.stubGlobal('window', {
      location: { hostname: '172.20.10.9' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('http://172.20.10.9:8080');
  });

  it('keeps localhost API when the page is also localhost', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('http://localhost:8080');
  });

  it('rewrites localhost API host to a 10.x page host in dev', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
    vi.stubGlobal('window', {
      location: { hostname: '10.0.0.5' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('http://10.0.0.5:8080');
  });

  it('keeps the configured API when the page host is not a private IPv4 address', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080');
    vi.stubGlobal('window', {
      location: { hostname: '10.evil.com' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('http://localhost:8080');
  });

  it('keeps a non-loopback API URL when the page is opened on the LAN', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ploutizo.app');
    vi.stubGlobal('window', {
      location: { hostname: '172.20.10.9' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('https://api.ploutizo.app');
  });

  it('rewrites 127.0.0.1 API host to the page host in dev', async () => {
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8080');
    vi.stubGlobal('window', {
      location: { hostname: '192.168.1.10' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('http://192.168.1.10:8080');
  });

  it('sends a Railway PR preview page to that preview API', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ploutizo.app');
    vi.stubGlobal('window', {
      location: { hostname: 'web-ploutizo-pr-223.up.railway.app' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('https://api-ploutizo-pr-223.up.railway.app');
  });

  it('keeps the configured API for a production page', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ploutizo.app');
    vi.stubGlobal('window', {
      location: { hostname: 'ploutizo.app' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('https://api.ploutizo.app');
  });

  it('uses the Railway environment name when the page host is unavailable', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ploutizo.app');
    vi.stubEnv('RAILWAY_ENVIRONMENT_NAME', 'ploutizo-pr-223');
    vi.stubGlobal('window', undefined);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('https://api-ploutizo-pr-223.up.railway.app');
  });
});
