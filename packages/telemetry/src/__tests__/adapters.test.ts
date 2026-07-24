import { describe, expect, it, vi } from 'vitest';
import { createConsoleTelemetryClient } from '../adapters/console';
import { createFakeTelemetryClient } from '../adapters/fake';
import { createNoopTelemetryClient } from '../adapters/noop';
import { createOperationId, createRequestId } from '../ids';
import { REDACTED } from '../sanitize';

describe('telemetry adapters', () => {
  it('console adapter emits sanitized structured records', () => {
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

    const operationId = createOperationId();
    const requestId = createRequestId();

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
        accountId: 'should-redact',
        method: 'GET',
      },
    });

    expect(info).toHaveBeenCalledTimes(1);
    const payload = info.mock.calls[0]?.[1] as {
      operation: string;
      attributes: Record<string, unknown>;
      operationId: string;
      requestId: string;
    };
    expect(payload.operation).toBe('transactions.list');
    expect(payload.operationId).toBe(operationId);
    expect(payload.requestId).toBe(requestId);
    expect(payload.attributes.accountId).toBe(REDACTED);
    expect(payload.attributes.status).toBe(200);
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
        attributes: { password: 'nope' },
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

  it('fake adapter records safe events and captures emit failures without throwing', async () => {
    const fake = createFakeTelemetryClient();

    fake.record({
      operation: 'route.preload',
      surface: 'web.dashboard',
      attributes: { description: 'secret note', route: '/dashboard' },
    });

    expect(fake.records).toHaveLength(1);
    expect(fake.records[0]?.attributes.description).toBe(REDACTED);
    expect(fake.records[0]?.attributes.route).toBe('/dashboard');

    fake.failNextEmit(new Error('transport down'));
    expect(() =>
      fake.record({
        operation: 'section.recover',
        surface: 'web.dashboard',
      })
    ).not.toThrow();

    expect(fake.failures).toHaveLength(1);
    await expect(fake.flush()).resolves.toBeUndefined();

    fake.reset();
    expect(fake.records).toHaveLength(0);
    expect(fake.failures).toHaveLength(0);
  });

  it('noop adapter is a silent TelemetryClient', () => {
    const noop = createNoopTelemetryClient();
    expect(() =>
      noop.record({
        operation: 'api.request.complete',
        surface: 'api.request',
        outcome: 'success',
      })
    ).not.toThrow();
  });
});
