import { describe, expect, it } from 'vitest';
import { resolveApiTelemetryEnv } from './env';

describe('resolveApiTelemetryEnv', () => {
  it('defaults to local when APP_ENV is missing or invalid', () => {
    expect(resolveApiTelemetryEnv({}).appEnv).toBe('local');
    expect(resolveApiTelemetryEnv({ APP_ENV: 'staging' }).appEnv).toBe('local');
  });

  it('does not infer environment from NODE_ENV', () => {
    expect(
      resolveApiTelemetryEnv({ NODE_ENV: 'production', APP_ENV: 'preview' }).appEnv
    ).toBe('preview');
  });

  it('enables export only when a PostHog token is present', () => {
    expect(
      resolveApiTelemetryEnv({
        APP_ENV: 'production',
        POSTHOG_PROJECT_TOKEN: 'phc_test',
      }).exportEnabled
    ).toBe(true);

    expect(
      resolveApiTelemetryEnv({ APP_ENV: 'production' }).exportEnabled
    ).toBe(false);
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
