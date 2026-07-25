import { describe, expect, it, vi } from 'vitest';
import { prepareTelemetryRecord } from '../contract';
import {
  asRecordSink,
  composeRecordSinks,
  createLevelSink,
  emitMessage,
  emitToLevelSink,
  safeEmitRecord,
  toEmitPayload,
} from '../emit';

describe('emit', () => {
  it('builds a stable wire payload from prepared records', () => {
    const record = prepareTelemetryRecord({
      operation: 'transactions.list',
      surface: 'web.transactions',
      level: 'info',
      outcome: 'success',
      attributes: { status: 200, count: 3 },
      message: 'Listed transactions',
    });

    expect(toEmitPayload(record)).toEqual({
      operation: 'transactions.list',
      surface: 'web.transactions',
      level: 'info',
      outcome: 'success',
      message: 'Listed transactions',
      attributes: { status: 200, count: 3 },
      droppedKeys: [],
      truncated: false,
      operationId: undefined,
      requestId: undefined,
      durationMs: undefined,
      recordedAt: record.recordedAt,
    });
    expect(emitMessage(record)).toBe('Listed transactions');
  });

  it('routes records to level handlers', () => {
    const warn = vi.fn();
    const sink = createLevelSink({
      debug: vi.fn(),
      info: vi.fn(),
      warn,
      error: vi.fn(),
    });

    const record = prepareTelemetryRecord({
      operation: 'section.recover',
      surface: 'web.dashboard',
      level: 'warn',
      attributes: { boundary: 'transactions-table' },
    });

    emitToLevelSink(sink, record);

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

    composeRecordSinks(
      asRecordSink(
        createLevelSink({
          debug: first,
          info: first,
          warn: first,
          error: first,
        })
      ),
      asRecordSink(
        createLevelSink({
          debug: second,
          info: second,
          warn: second,
          error: second,
        })
      )
    ).emit(record);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
