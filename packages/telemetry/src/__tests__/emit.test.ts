import { describe, expect, it, vi } from 'vitest';
import { prepareTelemetryRecord } from '../contract';
import {
  asRecordSink,
  composeRecordSinks,
  emitMessage,
  safeEmitRecord,
  type TelemetryLevelSink,
} from '../emit';

describe('emit', () => {
  it('uses message when present, otherwise the operation name', () => {
    const withMessage = prepareTelemetryRecord({
      operation: 'transactions.list',
      surface: 'web.transactions',
      message: 'Listed transactions',
    });
    const withoutMessage = prepareTelemetryRecord({
      operation: 'accounts.list',
      surface: 'web.accounts',
    });

    expect(emitMessage(withMessage)).toBe('Listed transactions');
    expect(emitMessage(withoutMessage)).toBe('accounts.list');
  });

  it('asRecordSink routes records to the matching level handler', () => {
    const warn = vi.fn();
    const sink: TelemetryLevelSink = {
      debug: vi.fn(),
      info: vi.fn(),
      warn,
      error: vi.fn(),
    };

    const record = prepareTelemetryRecord({
      operation: 'section.recover',
      surface: 'web.dashboard',
      level: 'warn',
      attributes: { boundary: 'transactions-table' },
    });

    asRecordSink(sink).emit(record);

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'section.recover' })
    );
  });

  it('safeEmitRecord swallows sink failures', () => {
    expect(() =>
      safeEmitRecord(
        {
          emit: () => {
            throw new Error('sink down');
          },
        },
        prepareTelemetryRecord({
          operation: 'accounts.list',
          surface: 'web.accounts',
        })
      )
    ).not.toThrow();
  });

  it('composeRecordSinks calls each sink', () => {
    const first = vi.fn();
    const second = vi.fn();
    const record = prepareTelemetryRecord({
      operation: 'accounts.list',
      surface: 'web.accounts',
    });

    const level = (handler: typeof first): TelemetryLevelSink => ({
      debug: handler,
      info: handler,
      warn: handler,
      error: handler,
    });

    composeRecordSinks(
      asRecordSink(level(first)),
      asRecordSink(level(second))
    ).emit(record);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
