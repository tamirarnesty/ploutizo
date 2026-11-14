import { describe, expect, it } from 'vitest';
import { buildColumns } from '@/components/transactions/TransactionColumns';
import {
  TRANSACTION_COLUMN_IDS,
  TRANSACTION_COLUMN_SIZES,
  isTransactionColumnLayoutCustom,
  moveTransactionColumn,
  parseStoredTransactionColumnLayout,
  resolveTransactionColumnOrder,
  resolveTransactionColumnWidths,
} from './transactionColumnLayout';

const ids = [...TRANSACTION_COLUMN_IDS];

describe('transactionColumnLayout', () => {
  it('uses the columns the transactions table renders', () => {
    const columns = buildColumns(
      () => undefined,
      () => undefined,
      () => undefined
    );
    expect(columns.map((column) => column.id)).toEqual(ids);
  });

  it('keeps a saved sequence and appends columns the save does not mention', () => {
    const withNotes = [
      'date',
      'notes',
      'type',
      'description',
      'category',
      'account',
      'assignees',
      'tags',
      'amount',
      'actions',
    ];
    expect(
      resolveTransactionColumnOrder(
        ['amount', 'date', 'type', 'removed'],
        withNotes
      )
    ).toEqual([
      'amount',
      'date',
      'type',
      'notes',
      'description',
      'category',
      'account',
      'assignees',
      'tags',
      'actions',
    ]);
  });

  it('drops a column that no longer exists and keeps actions last', () => {
    expect(
      resolveTransactionColumnOrder(
        ['actions', 'tags', 'tags', 'retired', 'amount'],
        ids
      )
    ).toEqual([
      'tags',
      'amount',
      'date',
      'type',
      'description',
      'category',
      'account',
      'assignees',
      'actions',
    ]);
  });

  it('falls back to the default sequence and widths when the save cannot be read', () => {
    expect(parseStoredTransactionColumnLayout(null)).toEqual({
      order: null,
      widths: {},
    });
    expect(parseStoredTransactionColumnLayout('not-json')).toEqual({
      order: null,
      widths: {},
    });
    expect(
      parseStoredTransactionColumnLayout(
        JSON.stringify({ order: 'date', widths: [] })
      )
    ).toEqual({ order: null, widths: {} });
  });

  it('keeps a readable sequence and drops widths that are not usable', () => {
    expect(
      parseStoredTransactionColumnLayout(
        JSON.stringify({
          order: ['amount', 'date'],
          widths: {
            date: 180,
            amount: 4,
            actions: 80,
            gone: 90,
            type: 'wide',
          },
        })
      )
    ).toEqual({
      order: ['amount', 'date'],
      widths: { date: 180, actions: 80, gone: 90 },
    });
    expect(
      resolveTransactionColumnWidths(
        { date: 180, gone: 90, amount: TRANSACTION_COLUMN_SIZES.amount },
        TRANSACTION_COLUMN_SIZES
      )
    ).toEqual({ date: 180 });
  });

  it('moves a data column and leaves the actions column where it is', () => {
    expect(moveTransactionColumn(ids, 'date', 'type')).toEqual([
      'type',
      'date',
      'description',
      'category',
      'account',
      'assignees',
      'tags',
      'amount',
      'actions',
    ]);
    expect(moveTransactionColumn(ids, 'date', 'actions')).toEqual([
      'type',
      'description',
      'category',
      'account',
      'assignees',
      'tags',
      'amount',
      'date',
      'actions',
    ]);
    expect(moveTransactionColumn(ids, 'actions', 'date')).toEqual(ids);
  });

  it('treats the default sequence and default widths as not customized', () => {
    expect(
      isTransactionColumnLayoutCustom(ids, {}, TRANSACTION_COLUMN_IDS)
    ).toBe(false);
    expect(
      isTransactionColumnLayoutCustom(
        ['amount', ...ids.filter((id) => id !== 'amount')],
        {},
        ids
      )
    ).toBe(true);
    expect(isTransactionColumnLayoutCustom(ids, { date: 180 }, ids)).toBe(true);
  });
});
