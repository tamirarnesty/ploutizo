import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiShutdown } from './serverLifecycle';

afterEach(() => {
  vi.useRealTimers();
});

describe('createApiShutdown', () => {
  it('closes the server, drains telemetry, and exits once', async () => {
    const events: string[] = [];
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        events.push('close-server');
        callback();
      }),
      closeAllConnections: vi.fn(),
    };
    const shutdownTelemetry = vi.fn(() => {
      events.push('shutdown-telemetry');
      return Promise.resolve();
    });
    const exit = vi.fn((code: number) => {
      events.push(`exit:${code}`);
    });
    const shutdown = createApiShutdown({
      server,
      shutdownTelemetry,
      exit,
    });

    await Promise.all([shutdown(), shutdown()]);

    expect(events).toEqual(['close-server', 'shutdown-telemetry', 'exit:0']);
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(shutdownTelemetry).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledOnce();
  });

  it('forces connections closed but still drains telemetry when server shutdown times out', async () => {
    vi.useFakeTimers();
    const server = {
      close: vi.fn(),
      closeAllConnections: vi.fn(),
    };
    const shutdownTelemetry = vi.fn(() => Promise.resolve());
    const exit = vi.fn();
    const shutdown = createApiShutdown({
      server,
      shutdownTelemetry,
      exit,
      serverShutdownTimeoutMs: 1,
    });

    const result = shutdown();
    await vi.advanceTimersByTimeAsync(1);
    await result;

    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(shutdownTelemetry).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits with failure when telemetry shutdown fails', async () => {
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => callback()),
      closeAllConnections: vi.fn(),
    };
    const exit = vi.fn();
    const shutdown = createApiShutdown({
      server,
      shutdownTelemetry: vi.fn().mockRejectedValue(new Error('export down')),
      exit,
    });

    await shutdown();

    expect(server.closeAllConnections).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
