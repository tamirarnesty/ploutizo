import { describe, expect, it } from 'vitest';
import { resolveWebTelemetryEnv } from './env';

describe('resolveWebTelemetryEnv', () => {
  it('defaults to local without a token and mirrors console only when explicit', () => {
    const env = resolveWebTelemetryEnv({
      VITE_APP_ENV: 'local',
      VITE_API_URL: 'http://localhost:8080',
    } as unknown as ImportMetaEnv);

    expect(env).toMatchObject({
      appEnv: 'local',
      exportEnabled: false,
      mirrorConsole: true,
      serviceName: 'ploutizo-web',
      posthogHost: 'https://us.i.posthog.com',
    });
  });

  it('enables export for preview when token is present', () => {
    const env = resolveWebTelemetryEnv({
      VITE_APP_ENV: 'preview',
      VITE_POSTHOG_PROJECT_TOKEN: 'phc_test',
      VITE_POSTHOG_HOST: 'https://us.i.posthog.com/',
      VITE_APP_RELEASE: '1.2.3',
    } as unknown as ImportMetaEnv);

    expect(env).toMatchObject({
      appEnv: 'preview',
      exportEnabled: true,
      mirrorConsole: false,
      posthogToken: 'phc_test',
      posthogHost: 'https://us.i.posthog.com',
      release: '1.2.3',
    });
  });

  it('infers preview when token exists without VITE_APP_ENV', () => {
    const env = resolveWebTelemetryEnv({
      VITE_POSTHOG_PROJECT_TOKEN: 'phc_test',
    } as unknown as ImportMetaEnv);

    expect(env.appEnv).toBe('preview');
    expect(env.mirrorConsole).toBe(false);
  });
});
