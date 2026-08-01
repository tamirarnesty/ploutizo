import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { DomainError, NotFoundError } from '../lib/errors';
import { registerApiErrorHandlers } from '../lib/apiErrorResponse';

describe('DomainError', () => {
  it('stores statusCode and message', () => {
    const err = new DomainError(422, 'unprocessable');
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('unprocessable');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  it('has statusCode 404 and is a DomainError', () => {
    const err = new NotFoundError('thing not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('thing not found');
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('app.onError() handler', () => {
  const buildApp = (thrower: () => never) => {
    const app = new Hono();
    app.get('/', () => {
      thrower();
    });
    registerApiErrorHandlers(app);
    return app;
  };

  it('maps NotFoundError to 404 NOT_FOUND', async () => {
    const app = buildApp(() => {
      throw new NotFoundError('thing not found');
    });
    const res = await app.request('/');
    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('thing not found');
  });

  it('maps DomainError to its statusCode', async () => {
    const app = buildApp(() => {
      throw new DomainError(422, 'invalid state');
    });
    const res = await app.request('/');
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('DOMAIN_ERROR');
    expect(body.error.message).toBe('invalid state');
  });

  it('includes DomainError details in the response body', async () => {
    const app = buildApp(() => {
      throw new DomainError(400, 'Some selected rows are not ready to import.', 'IMPORT_CONTINUE_NOT_READY', {
        rows: [{ batchRowId: 'row_1' }],
      });
    });
    const res = await app.request('/');
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; message: string; details?: { rows: { batchRowId: string }[] } };
    };
    expect(body.error.code).toBe('IMPORT_CONTINUE_NOT_READY');
    expect(body.error.details).toEqual({ rows: [{ batchRowId: 'row_1' }] });
  });

  it('maps generic Error to 500 INTERNAL_ERROR', async () => {
    const app = buildApp(() => {
      throw new Error('boom');
    });
    const res = await app.request('/');
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Unexpected error');
  });
});
