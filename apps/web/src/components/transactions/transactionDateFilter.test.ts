import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  dateFilterFromSearch,
  dateFilterToDraft,
  dateFilterToSearch,
  draftAfterDay,
  draftToDateFilter,
  formatDateDraft,
  formatTransactionDateFilterLabel,
  isDateDraftComplete,
  orderDateDraft,
  parseDateDraftText,
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
    const partial = { operator: 'between' as const, start: '2026-11-01' };
    expect(isDateDraftComplete(partial)).toBe(false);
    expect(isDateDraftComplete({ ...partial, end: '2026-11-09' })).toBe(true);
    expect(isDateDraftComplete({ operator: 'is', start: '2026-11-01' })).toBe(
      true
    );
  });

  it('uses the clicked day, and a finished range starts again from that day', () => {
    const open = { operator: 'between' as const, start: '2026-11-20' };
    expect(draftAfterDay(open, '2026-11-05')).toEqual({
      operator: 'between',
      start: '2026-11-05',
      end: '2026-11-20',
    });
    expect(draftAfterDay(open, '2026-11-20')).toEqual({
      operator: 'between',
      start: '2026-11-20',
      end: '2026-11-20',
    });
    expect(draftAfterDay(open, '2026-11-25')).toEqual({
      operator: 'between',
      start: '2026-11-20',
      end: '2026-11-25',
    });
    expect(
      draftAfterDay(
        { operator: 'between', start: '2026-11-01', end: '2026-11-09' },
        '2026-11-15'
      )
    ).toEqual({ operator: 'between', start: '2026-11-15' });
  });

  it('orders a range whose typed end comes first', () => {
    expect(
      orderDateDraft({
        operator: 'between',
        start: '2026-11-20',
        end: '2026-11-05',
      })
    ).toEqual({
      operator: 'between',
      start: '2026-11-05',
      end: '2026-11-20',
    });
  });

  it('keeps one field in sync with the draft', () => {
    const open = { operator: 'between' as const, start: '2026-11-05' };
    const range = {
      operator: 'between' as const,
      start: '2026-11-01',
      end: '2026-11-20',
    };
    const single = { operator: 'is' as const, start: '2026-11-05' };

    expect(formatDateDraft(open)).toBe('Nov 5, 2026 –');
    expect(parseDateDraftText('between', formatDateDraft(open))).toEqual(open);
    expect(parseDateDraftText('between', formatDateDraft(range))).toEqual(
      range
    );
    expect(parseDateDraftText('is', formatDateDraft(single))).toEqual(single);
    expect(parseDateDraftText('between', 'Nov 20, 2026 - Nov 5, 2026')).toEqual(
      {
        operator: 'between',
        start: '2026-11-05',
        end: '2026-11-20',
      }
    );
    expect(parseDateDraftText('between', '05/11/2026 to 20/11/2026')).toEqual({
      operator: 'between',
      start: '2026-11-05',
      end: '2026-11-20',
    });
    expect(parseDateDraftText('between', 'Nov 5, 2026 – 31/02/2026')).toBe(
      undefined
    );
    expect(parseDateDraftText('is', 'Nov 5, 2026 – Nov 20, 2026')).toBe(
      undefined
    );
    expect(parseDateDraftText('between', '   ')).toEqual({
      operator: 'between',
    });
  });

  it('accepts a typed day only when it round-trips', () => {
    expect(parseTypedDate('Nov 5, 2026')).toBe('2026-11-05');
    expect(parseTypedDate('nov 5, 2026')).toBe('2026-11-05');
    expect(parseTypedDate('2026-11-05')).toBe('2026-11-05');
    expect(parseTypedDate('05/11/2026')).toBe('2026-11-05');
    expect(parseTypedDate('nope')).toBeUndefined();
    expect(parseTypedDate('31/02/2026')).toBeUndefined();
    expect(parseTypedDate('')).toBeUndefined();
  });
});
