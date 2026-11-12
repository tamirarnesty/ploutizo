import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  dateFilterFromSearch,
  dateFilterToDraft,
  dateFilterToSearch,
  draftAfterDay,
  draftToDateFilter,
  formatTransactionDateFilterLabel,
  isDateDraftComplete,
  parseTypedDate,
  presetDateRange,
  presetFocusMonth,
} from './transactionDateFilter';
import type { TransactionDateFilter } from './transactionDateFilter';

const TODAY = new Date(2026, 10, 9);

const ymd = (date: Date) => format(date, 'yyyy-MM-dd');

const allFilters: TransactionDateFilter[] = [
  { operator: 'between', from: '2026-11-01', to: '2026-11-09' },
  { operator: 'not_between', from: '2026-11-01', to: '2026-11-09' },
  { operator: 'is', date: '2026-11-05' },
  { operator: 'is_not', date: '2026-11-05' },
  { operator: 'before', date: '2026-11-30' },
  { operator: 'after', date: '2026-11-01' },
];

describe('URL codec', () => {
  it('round-trips every operator', () => {
    for (const filter of allFilters) {
      expect(dateFilterFromSearch(dateFilterToSearch(filter))).toEqual(filter);
    }
  });

  it('keeps the default between operator out of the URL', () => {
    expect(dateFilterToSearch(allFilters[0])).toEqual({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-09',
      dateRange_op: undefined,
    });
  });

  it('maps single-date operators to the param the API reads', () => {
    expect(
      dateFilterToSearch({ operator: 'after', date: '2026-11-01' })
    ).toEqual({
      dateFrom: '2026-11-01',
      dateTo: undefined,
      dateRange_op: 'after',
    });
    expect(
      dateFilterToSearch({ operator: 'before', date: '2026-11-30' })
    ).toEqual({
      dateFrom: undefined,
      dateTo: '2026-11-30',
      dateRange_op: 'before',
    });
  });

  it('clears every date param for "all time"', () => {
    expect(dateFilterToSearch(null)).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
      dateRange_op: undefined,
    });
  });

  it('reads no filter when the params cannot express one', () => {
    expect(dateFilterFromSearch({})).toBeNull();
    expect(dateFilterFromSearch({ dateRange_op: 'after' })).toBeNull();
    expect(dateFilterFromSearch({ dateFrom: '2026-11-01' })).toBeNull();
    expect(
      dateFilterFromSearch({
        dateTo: '2026-11-09',
        dateRange_op: 'not_between',
      })
    ).toBeNull();
  });

  it('drops an unknown operator instead of treating it as between', () => {
    expect(
      dateFilterFromSearch({
        dateFrom: '2026-11-01',
        dateTo: '2026-11-09',
        dateRange_op: 'bogus',
      })
    ).toBeNull();
  });
});

describe('presets', () => {
  it('computes month and year ranges', () => {
    const range = (id: Parameters<typeof presetDateRange>[0]) => {
      const { from, to } = presetDateRange(id, TODAY);
      return [ymd(from), ymd(to)];
    };
    expect(range('this_month')).toEqual(['2026-11-01', '2026-11-30']);
    expect(range('last_month')).toEqual(['2026-10-01', '2026-10-31']);
    expect(range('this_year')).toEqual(['2026-01-01', '2026-12-31']);
  });

  it('keeps today in view for ranges containing it, else anchors on the end', () => {
    expect(presetFocusMonth(presetDateRange('this_year', TODAY), TODAY)).toBe(
      TODAY
    );
    const lastMonth = presetDateRange('last_month', TODAY);
    expect(presetFocusMonth(lastMonth, TODAY)).toBe(lastMonth.to);
  });

  it('follows the day it is given, not a cached one', () => {
    const tomorrow = new Date(2026, 10, 10);
    const dec = new Date(2026, 11, 1);
    expect(
      formatTransactionDateFilterLabel(
        { operator: 'between', from: '2026-11-01', to: '2026-11-30' },
        tomorrow
      )
    ).toBe('This month');
    expect(
      formatTransactionDateFilterLabel(
        { operator: 'between', from: '2026-11-01', to: '2026-11-30' },
        dec
      )
    ).toBe('Last month');
  });
});

describe('formatTransactionDateFilterLabel', () => {
  it('names all time and presets', () => {
    expect(formatTransactionDateFilterLabel(null, TODAY)).toBe('All time');
    expect(
      formatTransactionDateFilterLabel(
        { operator: 'between', from: '2026-01-01', to: '2026-12-31' },
        TODAY
      )
    ).toBe('This year');
  });

  it('formats custom ranges and single dates', () => {
    expect(formatTransactionDateFilterLabel(allFilters[0], TODAY)).toBe(
      'Nov 1 – Nov 9, 2026'
    );
    expect(formatTransactionDateFilterLabel(allFilters[1], TODAY)).toBe(
      'Not between Nov 1 – Nov 9, 2026'
    );
    expect(formatTransactionDateFilterLabel(allFilters[2], TODAY)).toBe(
      'Is Nov 5, 2026'
    );
    expect(formatTransactionDateFilterLabel(allFilters[4], TODAY)).toBe(
      'Before Nov 30, 2026'
    );
  });

  it('does not mistake a preset-shaped range under another operator for a preset', () => {
    expect(
      formatTransactionDateFilterLabel(
        { operator: 'not_between', from: '2026-11-01', to: '2026-11-30' },
        TODAY
      )
    ).toBe('Not between Nov 1 – Nov 30, 2026');
  });
});

describe('date draft', () => {
  it('round-trips every filter through the draft', () => {
    for (const filter of allFilters) {
      expect(draftToDateFilter(dateFilterToDraft(filter))).toEqual(filter);
    }
  });

  it('maps "all time" to an empty between selection and back', () => {
    const empty = dateFilterToDraft(null);
    expect(empty).toEqual({ operator: 'between' });
    expect(isDateDraftComplete(empty)).toBe(true);
    expect(draftToDateFilter(empty)).toBeNull();
  });

  it('holds a range with one end picked back from applying', () => {
    const partial = {
      operator: 'between' as const,
      start: new Date(2026, 10, 1),
    };
    expect(isDateDraftComplete(partial)).toBe(false);
    expect(isDateDraftComplete({ ...partial, end: TODAY })).toBe(true);
    expect(
      isDateDraftComplete({
        operator: 'is',
        start: new Date(2026, 10, 1),
      })
    ).toBe(true);
  });

  it('uses the clicked day, including an earlier end and a one-day range', () => {
    const start = new Date(2026, 10, 20);
    const open = { operator: 'between' as const, start };
    expect(draftAfterDay(open, new Date(2026, 10, 5))).toEqual({
      operator: 'between',
      start: new Date(2026, 10, 5),
      end: start,
    });
    expect(draftAfterDay(open, start)).toEqual({
      operator: 'between',
      start,
      end: start,
    });
    expect(draftAfterDay(open, new Date(2026, 10, 25))).toEqual({
      operator: 'between',
      start,
      end: new Date(2026, 10, 25),
    });
  });

  it('parses the typed date formats the input accepts', () => {
    expect(ymd(parseTypedDate('Nov 5, 2026')!)).toBe('2026-11-05');
    expect(ymd(parseTypedDate('2026-11-05')!)).toBe('2026-11-05');
    expect(parseTypedDate('nope')).toBeUndefined();
  });
});
