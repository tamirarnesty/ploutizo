import { afterEach, describe, expect, it, vi } from 'vitest';

const loadAllowedOrigins = async () => {
  vi.resetModules();
  return import('./allowedOrigins');
};

describe('allowedOrigins', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('allows production and local static origins', async () => {
    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin('https://ploutizo.app')).toBe(true);
    expect(isAllowedOrigin('https://www.ploutizo.app')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
  });

  it('allows Railway PR preview web origins', async () => {
    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin('https://web-ploutizo-pr-105.up.railway.app')).toBe(
      true
    );
  });

  it('rejects tenant subdomains', async () => {
    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin('https://golden-newt.ploutizo.app')).toBe(false);
  });

  it('rejects unknown origins', async () => {
    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
    expect(isAllowedOrigin('https://web-ploutizo-pr-105.example.com')).toBe(
      false
    );
  });

  it.each(['local', 'preview', 'production', undefined])(
    'rejects private-network origins when dev:host is off (APP_ENV=%s)',
    async (appEnv) => {
      vi.unstubAllEnvs();
      if (appEnv) {
        vi.stubEnv('APP_ENV', appEnv);
      }

      const { isAllowedOrigin } = await loadAllowedOrigins();

      expect(isAllowedOrigin('http://172.20.10.9:3000')).toBe(false);
    }
  );

  it.each([
    'http://10.0.0.5:3000',
    'http://172.16.0.1:3000',
    'http://172.20.10.9:3000',
    'http://172.31.255.255:3000',
    'http://192.168.1.42:3000',
  ])('allows %s when dev:host opts in', async (origin) => {
    vi.stubEnv('ALLOW_LAN_DEV_ORIGINS', '1');

    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin(origin)).toBe(true);
  });

  it('accepts a private-network authorized party and echoes the normalized origin', async () => {
    vi.stubEnv('ALLOW_LAN_DEV_ORIGINS', '1');

    const { isAllowedParty, resolveAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedParty('http://172.20.10.9:3000/')).toBe(true);
    expect(resolveAllowedOrigin('http://172.20.10.9:3000/')).toBe(
      'http://172.20.10.9:3000'
    );
  });

  it.each([
    'https://172.20.10.9:3000',
    'http://172.20.10.9:8080',
    'http://10.evil.com:3000',
    'http://192.168.evil.com:3000',
    'http://172.16.not-an-ip:3000',
    'http://192.168.1.1.nip.io:3000',
    'http://8.8.8.8:3000',
    'http://172.15.0.1:3000',
    'http://172.32.0.1:3000',
    'http://10.0.0.256:3000',
    'http://evil.example.com:3000',
  ])('rejects %s even when dev:host opts in', async (origin) => {
    vi.stubEnv('ALLOW_LAN_DEV_ORIGINS', '1');

    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin(origin)).toBe(false);
  });

  it('rejects private-network origins in production even if the dev:host flag is set', async () => {
    vi.stubEnv('ALLOW_LAN_DEV_ORIGINS', '1');
    vi.stubEnv('NODE_ENV', 'production');

    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin('http://172.20.10.9:3000')).toBe(false);
  });

  it('supports extra origins from CORS_ALLOWED_ORIGINS', async () => {
    vi.stubEnv(
      'CORS_ALLOWED_ORIGINS',
      'https://preview.example.com, https://staging.example.com'
    );

    const { isAllowedOrigin } = await loadAllowedOrigins();

    expect(isAllowedOrigin('https://preview.example.com')).toBe(true);
    expect(isAllowedOrigin('https://staging.example.com')).toBe(true);
  });

  it('resolveAllowedOrigin returns null for missing or invalid origins', async () => {
    const { resolveAllowedOrigin } = await loadAllowedOrigins();

    expect(resolveAllowedOrigin(undefined)).toBeNull();
    expect(resolveAllowedOrigin('https://evil.example.com')).toBeNull();
    expect(resolveAllowedOrigin('https://ploutizo.app')).toBe(
      'https://ploutizo.app'
    );
  });
});
