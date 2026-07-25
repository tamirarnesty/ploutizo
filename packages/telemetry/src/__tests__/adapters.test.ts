import { describe, expect, it, vi } from 'vitest';
import {
  createConsoleLevelSink,
  createConsoleTelemetryClient,
} from '../adapters/console';
import { createFakeTelemetryClient } from '../adapters/fake';
import { createNoopTelemetryClient } from '../adapters/noop';
import {
  createPostHogLevelSink,
  createPostHogTelemetryClient,
} from '../adapters/posthog';
import { createCorrelationId } from '../ids';
import {
  asRecordSink,
  composeRecordSinks,
  createSinkTelemetryClient,
} from '../emit';

describe('telemetry adapters', () => {
  it('console adapter emits structured records via the shared level sink', () => {
    const info = vi.fn();
    const client = createConsoleTelemetryClient({
      prefix: '[telemetry]',
      sink: {
        debug: vi.fn(),
        info,
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
      },
    });

    const operationId = createCorrelationId();
    const requestId = createCorrelationId();

    client.record({
      operation: 'transactions.list',
      surface: 'web.transactions',
      level: 'info',
      outcome: 'success',
      operationId,
      requestId,
      durationMs: 18,
      attributes: {
        status: 200,
        count: 4,
      },
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0]?.[0]).toBe('[telemetry]');
    expect(info.mock.calls[0]?.[1]).toBe('transactions.list');
    expect(info.mock.calls[0]?.[2]).toMatchObject({
      operation: 'transactions.list',
      attributes: { status: 200, count: 4 },
      operationId,
      requestId,
    });
  });

  it('posthog adapter routes levels to logger and capture for wide events', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const capture = vi.fn();
    const flush = vi.fn(async () => undefined);
    const client = createPostHogTelemetryClient({
      logger,
      capture,
      flush,
    });

    client.record({
      operation: 'api.request.complete',
      surface: 'api.request',
      level: 'info',
      outcome: 'success',
      message: 'Request completed',
      attributes: { status: 200, route: '/api/accounts' },
    });

    expect(logger.info).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        operation: 'api.request.complete',
        attributes: { status: 200, route: '/api/accounts' },
      })
    );
    expect(capture).toHaveBeenCalledWith(
      'api.request.complete',
      expect.objectContaining({
        operation: 'api.request.complete',
      })
    );
  });

  it('composeRecordSinks fans out to console and posthog sinks', () => {
    const info = vi.fn();
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const client = createSinkTelemetryClient(
      composeRecordSinks(
        asRecordSink(
          createConsoleLevelSink({
            sink: {
              debug: vi.fn(),
              info,
              warn: vi.fn(),
              error: vi.fn(),
              log: vi.fn(),
            },
          })
        ),
        asRecordSink(
          createPostHogLevelSink({
            logger,
            capture: vi.fn(),
          })
        )
      )
    );

    client.record({
      operation: 'route.preload',
      surface: 'web.dashboard',
      attributes: { route: '/dashboard' },
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('console and noop adapters preserve caller results when emission fails', async () => {
    const throwingSink = {
      debug: () => {
        throw new Error('console broken');
      },
      info: () => {
        throw new Error('console broken');
      },
      warn: () => {
        throw new Error('console broken');
      },
      error: () => {
        throw new Error('console broken');
      },
      log: () => {
        throw new Error('console broken');
      },
    };

    const consoleClient = createConsoleTelemetryClient({ sink: throwingSink });
    const noop = createNoopTelemetryClient();

    const work = async () => {
      consoleClient.record({
        operation: 'accounts.list',
        surface: 'api.accounts',
        attributes: { status: 200 },
      });
      noop.record({
        operation: 'accounts.list',
        surface: 'api.accounts',
      });
      await consoleClient.flush();
      await noop.flush();
      return { ok: true as const };
    };

    await expect(work()).resolves.toEqual({ ok: true });
  });

  it('console adapter ignores invalid catalog entries without throwing', () => {
    const client = createConsoleTelemetryClient({
      sink: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
      },
    });

    expect(() =>
      client.record({
        // @ts-expect-error runtime invalid catalog entry
        operation: 'missing.operation',
        surface: 'web.dashboard',
      })
    ).not.toThrow();
  });

  it('fake adapter records events and swallows emit failures without throwing', async () => {
    const fake = createFakeTelemetryClient();

    fake.record({
      operation: 'route.preload',
      surface: 'web.dashboard',
      attributes: { route: '/dashboard' },
    });

    expect(fake.records).toHaveLength(1);
    expect(fake.records[0]?.attributes.route).toBe('/dashboard');

    fake.failNextEmit(new Error('transport down'));
    expect(() =>
      fake.record({
        operation: 'section.recover',
        surface: 'web.dashboard',
        attributes: { boundary: 'transactions-table' },
      })
    ).not.toThrow();

    // Emit failure was swallowed; only the successful record remains.
    expect(fake.records).toHaveLength(1);
    await expect(fake.flush()).resolves.toBeUndefined();

    fake.reset();
    expect(fake.records).toHaveLength(0);
  });

  it('noop adapter is a silent TelemetryClient', () => {
    const noop = createNoopTelemetryClient();
    expect(() =>
      noop.record({
        operation: 'api.request.complete',
        surface: 'api.request',
        outcome: 'success',
        attributes: { status: 200, route: '/api/health' },
      })
    ).not.toThrow();
  });
});
