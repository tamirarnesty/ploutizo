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
  });

  it('allows Railway PR preview web origins', async () => {
    const { isAllowedOrigin, isAllowedParty } = await loadAllowedOrigins();

    expect(
      isAllowedOrigin('https://web-ploutizo-pr-105.up.railway.app')
    ).toBe(true);
    expect(
      isAllowedParty('https://web-ploutizo-pr-105.up.railway.app')
    ).toBe(true);
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
