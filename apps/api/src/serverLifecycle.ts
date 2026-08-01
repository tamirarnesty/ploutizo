export interface ApiServer {
  close: (callback: (error?: Error) => void) => void;
  closeAllConnections?: () => void;
}

interface ApiShutdownOptions {
  server: ApiServer;
  shutdownTelemetry: () => Promise<void>;
  exit: (code: number) => void;
  serverShutdownTimeoutMs?: number;
  telemetryShutdownTimeoutMs?: number;
}

const closeServer = (server: ApiServer): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
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
          () => reject(new Error(`${operation} timed out.`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Stops accepting work, drains telemetry, and exits once. Signal handlers use
 * this because registering one disables Node's default signal termination.
 */
export const createApiShutdown = ({
  server,
  shutdownTelemetry,
  exit,
  serverShutdownTimeoutMs = 8_000,
  telemetryShutdownTimeoutMs = 2_500,
}: ApiShutdownOptions): (() => Promise<void>) => {
  let inFlight: Promise<void> | undefined;

  return () =>
    (inFlight ??= (async () => {
      let exitCode = 0;

      try {
        await withTimeout(
          closeServer(server),
          serverShutdownTimeoutMs,
          'HTTP server shutdown'
        );
      } catch {
        exitCode = 1;
        server.closeAllConnections?.();
      }

      try {
        await withTimeout(
          shutdownTelemetry(),
          telemetryShutdownTimeoutMs,
          'Telemetry shutdown'
        );
      } catch {
        exitCode = 1;
      }

      exit(exitCode);
    })());
};
