import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiShutdown } from './serverLifecycle';

afterEach(() => {
  vi.useRealTimers();
});

describe('createApiShutdown', () => {
  it('closes the server, drains resources and telemetry, and exits once', async () => {
    const events: string[] = [];
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        events.push('close-server');
        callback();
      }),
      closeIdleConnections: vi.fn(),
      closeAllConnections: vi.fn(),
    };
    const shutdownResources = vi.fn(() => {
      events.push('shutdown-resources');
      return Promise.resolve();
    });
    const shutdownTelemetry = vi.fn(() => {
      events.push('shutdown-telemetry');
      return Promise.resolve();
    });
    const exit = vi.fn((code: number) => {
      events.push(`exit:${code}`);
    });
    const shutdown = createApiShutdown({
      server,
      shutdownResources,
      shutdownTelemetry,
      exit,
    });

    await Promise.all([shutdown(), shutdown()]);

    expect(events).toEqual([
      'close-server',
      'shutdown-resources',
      'shutdown-telemetry',
      'exit:0',
    ]);
    expect(server.closeIdleConnections).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(shutdownResources).toHaveBeenCalledTimes(1);
    expect(shutdownTelemetry).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledOnce();
  });

  it('sweeps idle connections while waiting for server close', async () => {
    vi.useFakeTimers();
    let closeCallback: ((error?: Error) => void) | undefined;
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        closeCallback = callback;
      }),
      closeIdleConnections: vi.fn(),
      closeAllConnections: vi.fn(),
    };
    const shutdown = createApiShutdown({
      server,
      shutdownTelemetry: vi.fn(() => Promise.resolve()),
      exit: vi.fn(),
      idleSweepIntervalMs: 250,
    });

    const result = shutdown();
    await vi.advanceTimersByTimeAsync(250);
    expect(server.closeIdleConnections).toHaveBeenCalledTimes(2);
    closeCallback?.();
    await result;
  });

  it('forces connections closed but still drains downstream work when server shutdown times out', async () => {
    vi.useFakeTimers();
    const server = {
      close: vi.fn(),
      closeIdleConnections: vi.fn(),
      closeAllConnections: vi.fn(),
    };
    const shutdownResources = vi.fn(() => Promise.resolve());
    const shutdownTelemetry = vi.fn(() => Promise.resolve());
    const exit = vi.fn();
    const shutdown = createApiShutdown({
      server,
      shutdownResources,
      shutdownTelemetry,
      exit,
      serverShutdownTimeoutMs: 1,
    });

    const result = shutdown();
    await vi.advanceTimersByTimeAsync(1);
    await result;

    expect(server.closeIdleConnections).toHaveBeenCalled();
    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(shutdownResources).toHaveBeenCalledOnce();
    expect(shutdownTelemetry).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits with failure when server close returns an error', async () => {
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        callback(new Error('close failed'));
      }),
      closeIdleConnections: vi.fn(),
      closeAllConnections: vi.fn(),
    };
    const exit = vi.fn();
    const shutdown = createApiShutdown({
      server,
      shutdownTelemetry: vi.fn(() => Promise.resolve()),
      exit,
    });

    await shutdown();

    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits with failure when telemetry shutdown fails', async () => {
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => callback()),
      closeIdleConnections: vi.fn(),
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
