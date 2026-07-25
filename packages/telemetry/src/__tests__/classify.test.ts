import { describe, expect, it } from 'vitest';
import {
  classifyApiOutcome,
  isReportableApiOutcome,
  toApiRequestCompleteAttributes,
} from '../classify';

describe('classifyApiOutcome', () => {
  it('treats validation, not-found, auth/tenant, and known domain conflicts as expected', () => {
    expect(
      classifyApiOutcome({ status: 400, code: 'VALIDATION_ERROR', kind: 'http' })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({ status: 404, code: 'NOT_FOUND', kind: 'http' })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({ status: 401, code: 'TENANT_REQUIRED', kind: 'http' })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({ status: 401, code: 'UNAUTHORIZED', kind: 'http' })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({ status: 409, code: 'CONFLICT', kind: 'http' })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({ status: 422, code: 'DOMAIN_ERROR', kind: 'http' })
    ).toEqual({ classification: 'expected', reportable: false });
  });

  it('treats network, malformed, 5xx, and unknown-code failures as unexpected/reportable', () => {
    expect(classifyApiOutcome({ kind: 'network' })).toEqual({
      classification: 'unexpected',
      reportable: true,
    });

    expect(classifyApiOutcome({ kind: 'malformed' })).toEqual({
      classification: 'unexpected',
      reportable: true,
    });

    expect(
      classifyApiOutcome({ status: 500, code: 'INTERNAL_ERROR', kind: 'http' })
    ).toEqual({ classification: 'unexpected', reportable: true });

    expect(
      classifyApiOutcome({ status: 502, code: 'BAD_GATEWAY', kind: 'http' })
    ).toEqual({ classification: 'unexpected', reportable: true });

    expect(
      classifyApiOutcome({ status: 500, code: 'UNKNOWN', kind: 'http' })
    ).toEqual({ classification: 'unexpected', reportable: true });

    expect(classifyApiOutcome({ kind: 'unknown' })).toEqual({
      classification: 'unexpected',
      reportable: true,
    });
  });

  it('allows explicit escalation of an otherwise expected failure', () => {
    expect(
      classifyApiOutcome({
        status: 404,
        code: 'NOT_FOUND',
        kind: 'http',
        escalate: true,
      })
    ).toEqual({ classification: 'unexpected', reportable: true });
  });

  it('defaults 4xx http outcomes without a known code to expected', () => {
    expect(classifyApiOutcome({ status: 400, kind: 'http' })).toEqual({
      classification: 'expected',
      reportable: false,
    });
  });

  it('treats successful HTTP statuses as expected and non-reportable', () => {
    expect(classifyApiOutcome({ status: 200, kind: 'http' })).toEqual({
      classification: 'expected',
      reportable: false,
    });
    expect(classifyApiOutcome({ status: 201, kind: 'http' })).toEqual({
      classification: 'expected',
      reportable: false,
    });
  });

  it('exposes isReportableApiOutcome as a convenience', () => {
    expect(
      isReportableApiOutcome({ status: 500, code: 'INTERNAL_ERROR', kind: 'http' })
    ).toBe(true);
    expect(
      isReportableApiOutcome({ status: 404, code: 'NOT_FOUND', kind: 'http' })
    ).toBe(false);
  });
});

describe('toApiRequestCompleteAttributes', () => {
  it('exposes only catalog-safe flat fields', () => {
    expect(
      toApiRequestCompleteAttributes({
        status: 500,
        method: 'GET',
        route: '/api/accounts/:id',
        code: 'INTERNAL_ERROR',
        kind: 'http',
        classification: 'unexpected',
        retryCount: 0,
        attempt: 1,
        // Sensitive / non-catalog fields must be ignored if passed loosely.
        message: 'should not appear',
        orgId: 'org_123',
        body: { secret: true },
      } as never)
    ).toEqual({
      status: 500,
      method: 'GET',
      route: '/api/accounts/:id',
      code: 'INTERNAL_ERROR',
      kind: 'http',
      classification: 'unexpected',
      retryCount: 0,
      attempt: 1,
    });
  });
});
