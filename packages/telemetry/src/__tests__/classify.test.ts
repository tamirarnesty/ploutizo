import { describe, expect, it } from 'vitest';
import { classifyApiOutcome } from '../classify';

describe('classifyApiOutcome', () => {
  it('treats validation, not-found, auth/tenant, and known domain conflicts as expected', () => {
    expect(
      classifyApiOutcome({
        status: 400,
        code: 'VALIDATION_ERROR',
        kind: 'http',
      })
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

    expect(
      classifyApiOutcome({
        status: 403,
        code: 'SELF_REMOVAL_FORBIDDEN',
        kind: 'http',
      })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({
        status: 409,
        code: 'ALREADY_MEMBER',
        kind: 'http',
      })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({
        status: 400,
        code: 'TRANSACTION_ACCOUNT_POLICY_VIOLATION',
        kind: 'http',
      })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({
        status: 400,
        code: 'IMPORT_FILE_CORRUPT',
        kind: 'http',
      })
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

  it('defaults status-only 4xx outcomes without a machine code to expected', () => {
    expect(classifyApiOutcome({ status: 400, kind: 'http' })).toEqual({
      classification: 'expected',
      reportable: false,
    });
  });

  it('treats any 4xx machine code as an expected application outcome', () => {
    expect(
      classifyApiOutcome({
        status: 403,
        code: 'FUTURE_UNKNOWN_CODE',
        kind: 'http',
      })
    ).toEqual({ classification: 'expected', reportable: false });

    expect(
      classifyApiOutcome({
        status: 400,
        code: 'TYPO_IN_NEW_HANDLER',
        kind: 'http',
      })
    ).toEqual({ classification: 'expected', reportable: false });
  });

  it('still reportables explicit system failure codes on 4xx', () => {
    expect(
      classifyApiOutcome({
        status: 400,
        code: 'INTERNAL_ERROR',
        kind: 'http',
      })
    ).toEqual({ classification: 'unexpected', reportable: true });

    expect(
      classifyApiOutcome({ status: 409, code: 'UNKNOWN', kind: 'http' })
    ).toEqual({ classification: 'unexpected', reportable: true });
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
});
