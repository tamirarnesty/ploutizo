import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('rewrites 127.0.0.1 API host to the page host in dev', async () => {
    vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8080');
    vi.stubGlobal('window', {
      location: { hostname: '192.168.1.10' },
    } as Window);

    const { getApiBaseUrl } = await import('./api-base-url');
    expect(getApiBaseUrl()).toBe('http://192.168.1.10:8080');
  });
});
