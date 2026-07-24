/**
 * Manual smoke demo for @ploutizo/telemetry (PLO-63).
 * Run from package: pnpm --filter @ploutizo/telemetry demo
 */
import {
  REDACTED,
  TelemetryApiError,
  classifyApiError,
  createConsoleTelemetryClient,
  createFakeTelemetryClient,
  createNoopTelemetryClient,
  createOperationId,
  createRequestId,
  prepareTelemetryRecord,
  sanitizeAttributes,
  toSafeApiErrorAttributes,
} from '../src/index';

const demo = async () => {
  const operationId = createOperationId();
  const requestId = createRequestId();

  console.log('=== correlation IDs ===');
  console.log({ operationId, requestId });

  console.log('\n=== sanitizeAttributes ===');
  const sanitized = sanitizeAttributes({
    status: 200,
    method: 'GET',
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    amountCents: 1299,
    description: 'Coffee',
    password: 'hunter2',
    outcome: 'success',
  });
  console.log(JSON.stringify(sanitized, null, 2));
  console.log('accountId redacted?', sanitized.attributes.accountId === REDACTED);

  console.log('\n=== prepareTelemetryRecord ===');
  const record = prepareTelemetryRecord({
    operation: 'transactions.list',
    surface: 'web.transactions',
    outcome: 'success',
    operationId,
    requestId,
    durationMs: 22,
    attributes: {
      status: 200,
      route: '/api/transactions',
      body: { secret: true },
    },
  });
  console.log(JSON.stringify(record, null, 2));

  console.log('\n=== TelemetryApiError classification ===');
  const expected = new TelemetryApiError({
    message: 'Transaction not found.',
    status: 404,
    code: 'NOT_FOUND',
    route: '/api/transactions/:id',
    method: 'GET',
    durationMs: 9,
  });
  const unexpected = new TelemetryApiError({
    message: 'Unexpected error',
    status: 500,
    code: 'INTERNAL_ERROR',
    route: '/api/transactions',
    method: 'POST',
    kind: 'http',
  });
  console.log({
    expected: classifyApiError(expected),
    unexpected: classifyApiError(unexpected),
    safeExpectedAttrs: toSafeApiErrorAttributes(expected),
  });

  console.log('\n=== adapters (console / noop / fake) ===');
  const fake = createFakeTelemetryClient();
  const noop = createNoopTelemetryClient();
  const consoleClient = createConsoleTelemetryClient({ prefix: '[demo]' });

  fake.record({
    operation: 'api.request.complete',
    surface: 'api.request',
    outcome: 'success',
    operationId,
    requestId,
    attributes: { status: 200, notes: 'should redact' },
  });
  noop.record({
    operation: 'accounts.list',
    surface: 'api.accounts',
  });
  consoleClient.record({
    operation: 'route.preload',
    surface: 'web.dashboard',
    attributes: { route: '/dashboard' },
  });

  await Promise.all([fake.flush(), noop.flush(), consoleClient.flush()]);
  console.log('fake records:', fake.records.length);
  console.log('fake first attributes:', fake.records[0]?.attributes);

  console.log('\nDemo complete — caller flow uninterrupted.');
};

demo().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
