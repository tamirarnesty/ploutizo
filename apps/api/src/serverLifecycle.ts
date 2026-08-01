export interface ApiServer {
  close: (callback: (error?: Error) => void) => void;
  closeIdleConnections?: () => void;
  closeAllConnections?: () => void;
}

interface ApiShutdownOptions {
  server: ApiServer;
  shutdownTelemetry: () => Promise<void>;
  shutdownResources?: () => Promise<void>;
  exit: (code: number) => void;
  serverShutdownTimeoutMs?: number;
  dbShutdownTimeoutMs?: number;
  telemetryShutdownTimeoutMs?: number;
  idleSweepIntervalMs?: number;
}

class ShutdownTimeoutError extends Error {
  constructor(operation: string) {
    super(`${operation} timed out.`);
    this.name = 'ShutdownTimeoutError';
  }
}

const DEFAULT_IDLE_SWEEP_INTERVAL_MS = 250;

const closeServerDraining = (
  server: ApiServer,
  idleSweepIntervalMs: number
): Promise<void> =>
  new Promise((resolve, reject) => {
    const sweepIdleConnections = () => {
      server.closeIdleConnections?.();
    };

    sweepIdleConnections();
    const interval = setInterval(sweepIdleConnections, idleSweepIntervalMs);

    server.close((error) => {
      clearInterval(interval);
      if (error) reject(error);
      else resolve();
    });
  });

const withTimeout = async <T>(
  work: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new ShutdownTimeoutError(operation)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const isShutdownTimeout = (error: unknown): boolean =>
  error instanceof ShutdownTimeoutError;

/**
 * Stops accepting work, drains telemetry, and exits once. Signal handlers use
 * this because registering one disables Node's default signal termination.
 */
export const createApiShutdown = ({
  server,
  shutdownTelemetry,
  shutdownResources,
  exit,
  serverShutdownTimeoutMs = 8_000,
  dbShutdownTimeoutMs = 5_000,
  telemetryShutdownTimeoutMs = 2_500,
  idleSweepIntervalMs = DEFAULT_IDLE_SWEEP_INTERVAL_MS,
}: ApiShutdownOptions): (() => Promise<void>) => {
  let inFlight: Promise<void> | undefined;

  return () =>
    (inFlight ??= (async () => {
      let exitCode = 0;

      try {
        await withTimeout(
          closeServerDraining(server, idleSweepIntervalMs),
          serverShutdownTimeoutMs,
          'HTTP server shutdown'
        );
      } catch (error) {
        server.closeAllConnections?.();
        if (!isShutdownTimeout(error)) exitCode = 1;
      }

      if (shutdownResources) {
        try {
          await withTimeout(
            shutdownResources(),
            dbShutdownTimeoutMs,
            'Database shutdown'
          );
        } catch (error) {
          if (!isShutdownTimeout(error)) exitCode = 1;
        }
      }

      try {
        await withTimeout(
          shutdownTelemetry(),
          telemetryShutdownTimeoutMs,
          'Telemetry shutdown'
        );
      } catch (error) {
        if (!isShutdownTimeout(error)) exitCode = 1;
      }

      exit(exitCode);
    })());
};
