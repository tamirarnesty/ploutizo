import { describe, expect, it, vi } from 'vitest';
import { createLocalTelemetryClient } from './createLocalTelemetryClient';
import { createPostHogTelemetryClient } from './createPostHogTelemetryClient';
import { createWebTelemetryClient } from './createWebTelemetryClient';

const baseEnv = {
  appEnv: 'preview' as const,
  serviceName: 'ploutizo-web',
  release: undefined,
  posthogToken: 'phc_test',
  posthogHost: 'https://us.i.posthog.com',
  exportEnabled: true,
  mirrorConsole: false,
};

describe('web telemetry clients', () => {
  it('maps contract records to PostHog structured logger', () => {
    const info = vi.fn();
    const posthog = {
      is_capturing: () => true,
      logger: { debug: vi.fn(), info, warn: vi.fn(), error: vi.fn() },
      flush: vi.fn().mockResolvedValue(undefined),
    };

    const client = createPostHogTelemetryClient({
      env: baseEnv,
      posthog: posthog as never,
    });

    client.record({
      operation: 'browser.api_request',
      surface: 'web.transactions',
      level: 'info',
      outcome: 'success',
      attributes: { status: 200, method: 'GET' },
    });

    expect(info).toHaveBeenCalledWith('browser.api_request', {
      'telemetry.operation': 'browser.api_request',
      'telemetry.surface': 'web.transactions',
      'deployment.environment': 'preview',
      'service.name': 'ploutizo-web',
      'telemetry.outcome': 'success',
      'attr.status': 200,
      'attr.method': 'GET',
    });
  });

  it('local client mirrors to console and PostHog without throwing on sink failure', async () => {
    const info = vi.fn(() => {
      throw new Error('console broken');
    });
    const posthogInfo = vi.fn();
    const posthog = {
      is_capturing: () => true,
      logger: {
        debug: vi.fn(),
        info: posthogInfo,
        warn: vi.fn(),
        error: vi.fn(),
      },
      flush: vi.fn().mockResolvedValue(undefined),
    };

    const client = createLocalTelemetryClient({
      env: { ...baseEnv, mirrorConsole: true },
      posthog: posthog as never,
      consoleClient: {
        record: () => {
          info();
        },
        flush: async () => {},
      },
    });

    await expect(
      Promise.resolve(
        client.record({
          operation: 'route.preload',
          surface: 'web.dashboard',
        })
      )
    ).resolves.toBeUndefined();

    expect(posthogInfo).toHaveBeenCalled();
  });

  it('falls back to noop when PostHog is unavailable', () => {
    const client = createWebTelemetryClient({
      env: { ...baseEnv, exportEnabled: false, mirrorConsole: false },
      posthog: null,
    });

    expect(() =>
      client.record({
        operation: 'section.render',
        surface: 'web.root',
      })
    ).not.toThrow();
  });
});
