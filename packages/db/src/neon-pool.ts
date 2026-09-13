import { Pool, neonConfig } from '@neondatabase/serverless';

// WebSocket mode: full transaction support + allows Neon compute to scale-to-zero.
// Node 22 provides native WebSocket globally — no 'ws' package needed.
// CRITICAL: neonConfig must be set BEFORE constructing the Pool.
let webSocketConfigured = false;

const configureNeonWebSocket = (): void => {
  if (webSocketConfigured) {
    return;
  }

  neonConfig.webSocketConstructor = globalThis.WebSocket;
  webSocketConfigured = true;
};

export const createNeonPool = (connectionString: string): Pool => {
  configureNeonWebSocket();
  return new Pool({ connectionString });
};
