import { describe, expect, it, vi } from 'vitest';
import { createConsoleTelemetryClient } from '../adapters/console';
import { createFakeTelemetryClient } from '../adapters/fake';
import { createNoopTelemetryClient } from '../adapters/noop';
import { createCorrelationId } from '../ids';

describe('telemetry adapters', () => {
  it('console adapter emits structured records', () => {
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
      operation: 'browser.api_request',
      surface: 'web.transactions',
      level: 'info',
      outcome: 'success',
      operationId,
      requestId,
      durationMs: 18,
      attributes: {
        status: 200,
        method: 'GET',
      },
    });

    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0]?.[0]).toBe('[telemetry]');
    expect(info.mock.calls[0]?.[1]).toBe('browser.api_request');
    expect(info.mock.calls[0]?.[2]).toMatchObject({
      operation: 'browser.api_request',
      attributes: { status: 200, method: 'GET' },
      operationId,
      requestId,
    });
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
        operation: 'browser.api_request',
        surface: 'web.accounts',
        attributes: { status: 200 },
      });
      noop.record({
        operation: 'browser.api_request',
        surface: 'web.accounts',
      });
      await consoleClient.flush();
      await noop.flush();
      return { ok: true as const };
    };

    await expect(work()).resolves.toEqual({ ok: true });
  });

  it('console adapter ignores invalid catalog pairs without throwing', () => {
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

  it('console adapter ignores incompatible operation/surface pairs', () => {
    const info = vi.fn();
    const client = createConsoleTelemetryClient({
      sink: {
        debug: vi.fn(),
        info,
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
      },
    });

    client.record({
      operation: 'api.request.complete',
      // @ts-expect-error API operations cannot be emitted from web surfaces.
      surface: 'web.transactions',
    });

    expect(info).not.toHaveBeenCalled();
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
