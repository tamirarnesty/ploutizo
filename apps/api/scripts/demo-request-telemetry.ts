import { Hono } from 'hono';
import {
  createCorrelationId,
  createFakeTelemetryClient,
} from '@ploutizo/telemetry';
import { REQUEST_ID_HEADER } from '../src/telemetry/headers';
import { requestTelemetry } from '../src/telemetry/requestTelemetry';
import { createNoopSpanHandle } from '../src/telemetry/spanHandle';
import type { AppEnv } from '../src/types';

const main = async () => {
  const fake = createFakeTelemetryClient();
  const app = new Hono<AppEnv>();
  app.use(
    '*',
    requestTelemetry({
      env: {
        appEnv: 'local',
        serviceName: 'ploutizo-api',
        release: 'demo',
        posthogToken: undefined,
        posthogHost: 'https://us.i.posthog.com',
        exportEnabled: false,
        mirrorConsole: true,
      },
      createClient: () => fake,
      startSpan: () => createNoopSpanHandle(),
    })
  );
  app.get('/health', (c) => c.json({ data: { status: 'ok' } }));
  app.get('/api/boom', () => {
    throw new Error('boom');
  });
  app.onError((_err, c) => {
    c.set('telemetryError', {
      code: 'INTERNAL_ERROR',
      kind: 'http',
      message: 'Unexpected error',
    });
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      500
    );
  });

  const lines: string[] = [];
  const inbound = createCorrelationId();
  const ok = await app.request('/health', {
    headers: { [REQUEST_ID_HEADER]: inbound },
  });
  lines.push('=== GET /health (valid X-Request-Id) ===');
  lines.push(`status: ${ok.status}`);
  lines.push(`X-Request-Id: ${ok.headers.get(REQUEST_ID_HEADER)}`);
  lines.push(`completion: ${JSON.stringify(fake.records[0], null, 2)}`);

  fake.reset();
  const boom = await app.request('/api/boom');
  lines.push('\n=== GET /api/boom (unexpected 500) ===');
  lines.push(`status: ${boom.status}`);
  lines.push(`X-Request-Id: ${boom.headers.get(REQUEST_ID_HEADER)}`);
  lines.push(`completion: ${JSON.stringify(fake.records[0], null, 2)}`);

  fake.reset();
  const invalid = await app.request('/health', {
    headers: { [REQUEST_ID_HEADER]: 'bad-id' },
  });
  lines.push('\n=== GET /health (invalid X-Request-Id regenerated) ===');
  lines.push(`status: ${invalid.status}`);
  lines.push(`X-Request-Id: ${invalid.headers.get(REQUEST_ID_HEADER)}`);
  lines.push(`regenerated: ${invalid.headers.get(REQUEST_ID_HEADER) !== 'bad-id'}`);

  console.log(lines.join('\n'));
};

await main();
