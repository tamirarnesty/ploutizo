import { describe, expect, it } from 'vitest';
import { resolveApiTelemetryEnv } from './env';

describe('resolveApiTelemetryEnv', () => {
  it('defaults to local without a token when APP_ENV is missing', () => {
    expect(resolveApiTelemetryEnv({}).appEnv).toBe('local');
    expect(resolveApiTelemetryEnv({}).mirrorConsole).toBe(false);
  });

  it('defaults to preview (not local) when a PostHog token is present without APP_ENV', () => {
    const resolved = resolveApiTelemetryEnv({
      POSTHOG_PROJECT_TOKEN: 'phc_test',
    });
    expect(resolved.appEnv).toBe('preview');
    expect(resolved.exportEnabled).toBe(true);
    expect(resolved.mirrorConsole).toBe(false);
  });

  it('mirrors console only when APP_ENV is explicitly local', () => {
    expect(resolveApiTelemetryEnv({ APP_ENV: 'local' }).mirrorConsole).toBe(
      true
    );
    expect(
      resolveApiTelemetryEnv({
        APP_ENV: 'production',
        POSTHOG_PROJECT_TOKEN: 'phc_test',
      }).mirrorConsole
    ).toBe(false);
  });

  it('does not infer environment from NODE_ENV', () => {
    expect(
      resolveApiTelemetryEnv({ NODE_ENV: 'production', APP_ENV: 'preview' })
        .appEnv
    ).toBe('preview');
  });

  it('treats invalid APP_ENV as unset', () => {
    expect(resolveApiTelemetryEnv({ APP_ENV: 'staging' }).appEnv).toBe('local');
  });

  it('prefers APP_RELEASE over Railway commit SHA', () => {
    expect(
      resolveApiTelemetryEnv({
        APP_RELEASE: '1.2.3',
        RAILWAY_GIT_COMMIT_SHA: 'abcdef',
      }).release
    ).toBe('1.2.3');
  });
});
