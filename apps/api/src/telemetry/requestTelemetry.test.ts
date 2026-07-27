import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { createCorrelationId } from '@ploutizo/telemetry';
import { createFakeTelemetryClient } from '@ploutizo/telemetry/adapters/fake';
import type { FakeTelemetryClient } from '@ploutizo/telemetry/adapters/fake';
import { DomainError, NotFoundError } from '../lib/errors';
import { OPERATION_ID_HEADER, REQUEST_ID_HEADER } from './headers';
import { requestTelemetry } from './requestTelemetry';
import { createNoopSpanHandle } from './spanHandle';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from '../types';
import type { ApiTelemetryEnv } from './env';

const testEnv: ApiTelemetryEnv = {
  appEnv: 'local',
  serviceName: 'ploutizo-api-test',
  release: 'test-release',
  posthogToken: undefined,
  posthogHost: 'https://us.i.posthog.com',
  exportEnabled: false,
  mirrorConsole: true,
};

const buildApp = (fake: FakeTelemetryClient) => {
  const app = new Hono<AppEnv>();
  app.use(
    '*',
    requestTelemetry({
      env: testEnv,
      createClient: () => fake,
      startSpan: () => createNoopSpanHandle(),
    })
  );

  app.get('/health', (c) => c.json({ data: { status: 'ok' } }));
  app.get('/api/accounts/:id', (c) =>
    c.json({ data: { id: c.req.param('id') } })
  );
  app.get('/api/boom', () => {
    throw new Error('explode');
  });
  app.get('/api/missing', () => {
    throw new NotFoundError('missing row');
  });
  app.get('/api/conflict', () => {
    throw new DomainError(409, 'already exists', 'CONFLICT');
  });
  app.get('/api/fail-emit', (c) => {
    fake.failNextEmit(new Error('exporter down'));
    return c.json({ data: { ok: true } });
  });
  app.get('/api/tenant-required', (c) =>
    c.json(
      {
        error: {
          code: 'TENANT_REQUIRED',
          message: 'No active organisation.',
        },
      },
      401
    )
  );

  app.notFound((c) => {
    c.set('telemetryError', { code: 'NOT_FOUND', kind: 'http' });
    return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  });

  app.onError((err, c) => {
    if (err instanceof NotFoundError) {
      c.set('telemetryError', { code: 'NOT_FOUND', kind: 'http' });
      return c.json(
        { error: { code: 'NOT_FOUND', message: err.message } },
        404
      );
    }
    if (err instanceof DomainError) {
      const code = err.code ?? 'DOMAIN_ERROR';
      c.set('telemetryError', { code, kind: 'http' });
      return c.json(
        { error: { code, message: err.message } },
        err.statusCode as ContentfulStatusCode
      );
    }
    c.set('telemetryError', { code: 'INTERNAL_ERROR', kind: 'http' });
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      500
    );
  });

  return app;
};

describe('requestTelemetry middleware', () => {
  it('generates a request ID when none is supplied and returns it', async () => {
    const fake = createFakeTelemetryClient();
    const res = await buildApp(fake).request('/health');

    expect(res.status).toBe(200);
    const requestId = res.headers.get(REQUEST_ID_HEADER);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(fake.records).toHaveLength(1);
    expect(fake.records[0]?.requestId).toBe(requestId);
  });

  it('accepts a valid inbound request ID and rejects invalid ones by regenerating', async () => {
    const fake = createFakeTelemetryClient();
    const valid = createCorrelationId();
    const app = buildApp(fake);

    const accepted = await app.request('/health', {
      headers: { [REQUEST_ID_HEADER]: valid },
    });
    expect(accepted.headers.get(REQUEST_ID_HEADER)).toBe(valid);

    fake.reset();
    const rejected = await app.request('/health', {
      headers: { [REQUEST_ID_HEADER]: 'not-a-uuid' },
    });
    const regenerated = rejected.headers.get(REQUEST_ID_HEADER);
    expect(regenerated).not.toBe('not-a-uuid');
    expect(regenerated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('emits one typed api.request.complete record with safe attributes', async () => {
    const fake = createFakeTelemetryClient();
    const operationId = createCorrelationId();
    const res = await buildApp(fake).request('/api/accounts/abc', {
      headers: { [OPERATION_ID_HEADER]: operationId },
    });

    expect(res.status).toBe(200);
    expect(fake.records).toHaveLength(1);
    const record = fake.records[0];
    expect(record).toMatchObject({
      operation: 'api.request.complete',
      surface: 'api.request',
      outcome: 'success',
      operationId,
      attributes: {
        status: 200,
        method: 'GET',
        classification: 'expected',
        kind: 'http',
        environment: 'local',
        service: 'ploutizo-api-test',
        release: 'test-release',
      },
    });
    expect(record.attributes.route).toContain('/api/accounts');
    expect(typeof record.durationMs).toBe('number');
    expect(record.attributes).not.toHaveProperty('orgId');
    expect(record.attributes).not.toHaveProperty('body');
    expect(record.message).toBeUndefined();
  });

  it('classifies expected domain/not-found outcomes without escalating', async () => {
    const fake = createFakeTelemetryClient();
    const app = buildApp(fake);

    const missing = await app.request('/api/missing');
    expect(missing.status).toBe(404);
    expect(fake.records[0]?.attributes).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      classification: 'expected',
    });

    fake.reset();
    const conflict = await app.request('/api/conflict');
    expect(conflict.status).toBe(409);
    expect(fake.records[0]?.attributes).toMatchObject({
      status: 409,
      code: 'CONFLICT',
      classification: 'expected',
    });
  });

  it('recovers machine codes from early-return JSON error bodies', async () => {
    const fake = createFakeTelemetryClient();
    const res = await buildApp(fake).request('/api/tenant-required');

    expect(res.status).toBe(401);
    expect(fake.records[0]?.attributes).toMatchObject({
      status: 401,
      code: 'TENANT_REQUIRED',
      classification: 'expected',
    });
  });

  it('classifies 5xx outcomes as unexpected/reportable', async () => {
    const fake = createFakeTelemetryClient();
    const res = await buildApp(fake).request('/api/boom');

    expect(res.status).toBe(500);
    expect(fake.records).toHaveLength(1);
    expect(fake.records[0]).toMatchObject({
      outcome: 'failure',
      level: 'error',
      attributes: {
        status: 500,
        code: 'INTERNAL_ERROR',
        classification: 'unexpected',
        environment: 'local',
        service: 'ploutizo-api-test',
      },
    });
    expect(fake.records[0]?.message).toBeUndefined();
  });

  it('does not alter API responses when telemetry emission fails', async () => {
    const fake = createFakeTelemetryClient();
    const res = await buildApp(fake).request('/api/fail-emit');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ok: boolean } };
    expect(body.data.ok).toBe(true);
    // failNextEmit swallowed the completion record
    expect(fake.records).toHaveLength(0);
  });

  it('keeps flush failures from delaying the response path', async () => {
    const fake = createFakeTelemetryClient();
    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 500);
        })
    );
    fake.flush = flush;

    const started = Date.now();
    const res = await buildApp(fake).request('/health');
    const elapsed = Date.now() - started;

    expect(res.status).toBe(200);
    expect(flush).toHaveBeenCalled();
    // Fire-and-forget flush budget is 50ms; response must not wait on the 500ms flush.
    expect(elapsed).toBeLessThan(200);
  });
});
