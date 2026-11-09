import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';
import {
  dateFilterFromSearch,
  dateFilterKind,
  dateFilterToSearch,
  formatTransactionDateFilterLabel,
  migrateDateFilterValues,
  presetDateRange,
} from './transactionDateFilter';

const TODAY = new Date(2026, 10, 9); // Nov 9, 2026 (local)

describe('dateFilterFromSearch / dateFilterToSearch', () => {
  it('round-trips a between range', () => {
    const params = dateFilterToSearch('between', ['2026-11-01', '2026-11-09']);
    expect(params).toEqual({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-09',
      dateRange_op: undefined,
    });
    expect(
      dateFilterFromSearch({
        dateFrom: '2026-11-01',
        dateTo: '2026-11-09',
      })
    ).toEqual({ operator: 'between', values: ['2026-11-01', '2026-11-09'] });
  });

  it('maps single-bound operators to the right URL params', () => {
    expect(dateFilterToSearch('after', ['2026-11-01'])).toEqual({
      dateFrom: '2026-11-01',
      dateTo: undefined,
      dateRange_op: 'after',
    });
    expect(dateFilterToSearch('before', ['2026-11-30'])).toEqual({
      dateFrom: undefined,
      dateTo: '2026-11-30',
      dateRange_op: 'before',
    });
    expect(dateFilterToSearch('is', ['2026-11-05'])).toEqual({
      dateFrom: '2026-11-05',
      dateTo: undefined,
      dateRange_op: 'is',
    });
    expect(dateFilterToSearch('is_not', ['2026-11-05'])).toEqual({
      dateFrom: '2026-11-05',
      dateTo: undefined,
      dateRange_op: 'is_not',
    });
  });

  it('reads operator params back from the URL', () => {
    expect(
      dateFilterFromSearch({ dateFrom: '2026-11-01', dateRange_op: 'after' })
    ).toEqual({ operator: 'after', values: ['2026-11-01'] });
    expect(
      dateFilterFromSearch({ dateTo: '2026-11-30', dateRange_op: 'before' })
    ).toEqual({ operator: 'before', values: ['2026-11-30'] });
    expect(
      dateFilterFromSearch({
        dateFrom: '2026-11-01',
        dateTo: '2026-11-09',
        dateRange_op: 'not_between',
      })
    ).toEqual({
      operator: 'not_between',
      values: ['2026-11-01', '2026-11-09'],
    });
  });

  it('clears the opposite bound when switching operator families', () => {
    const params = dateFilterToSearch('is', ['2026-11-05']);
    expect(params.dateTo).toBeUndefined();
    expect(params.dateRange_op).toBe('is');
  });
});

describe('presets', () => {
  it('computes month and year ranges', () => {
    const ymd = (date: Date) => format(date, 'yyyy-MM-dd');
    expect(
      [
        presetDateRange('this_month', TODAY).from,
        presetDateRange('this_month', TODAY).to,
      ].map(ymd)
    ).toEqual(['2026-11-01', '2026-11-30']);
    expect(
      [
        presetDateRange('last_month', TODAY).from,
        presetDateRange('last_month', TODAY).to,
      ].map(ymd)
    ).toEqual(['2026-10-01', '2026-10-31']);
    expect(
      [
        presetDateRange('this_year', TODAY).from,
        presetDateRange('this_year', TODAY).to,
      ].map(ymd)
    ).toEqual(['2026-01-01', '2026-12-31']);
  });

  it('classifies preset, all-time and custom states', () => {
    expect(dateFilterKind('between', [], TODAY)).toBe('all');
    expect(dateFilterKind('between', ['2026-11-01', '2026-11-30'], TODAY)).toBe(
      'this_month'
    );
    expect(dateFilterKind('between', ['2026-10-01', '2026-10-31'], TODAY)).toBe(
      'last_month'
    );
    expect(dateFilterKind('between', ['2026-01-01', '2026-12-31'], TODAY)).toBe(
      'this_year'
    );
    expect(dateFilterKind('between', ['2026-11-03', '2026-11-09'], TODAY)).toBe(
      'custom'
    );
    expect(dateFilterKind('is', ['2026-11-05'], TODAY)).toBe('custom');
  });
});

describe('formatTransactionDateFilterLabel', () => {
  it('names presets and all time', () => {
    expect(formatTransactionDateFilterLabel('between', [], TODAY)).toBe(
      'All time'
    );
    expect(
      formatTransactionDateFilterLabel(
        'between',
        ['2026-11-01', '2026-11-30'],
        TODAY
      )
    ).toBe('This month');
  });

  it('formats custom ranges and single dates', () => {
    expect(
      formatTransactionDateFilterLabel(
        'between',
        ['2026-11-03', '2026-11-09'],
        TODAY
      )
    ).toBe('Nov 3 – Nov 9, 2026');
    expect(formatTransactionDateFilterLabel('is', ['2026-11-05'], TODAY)).toBe(
      'Is Nov 5, 2026'
    );
    expect(
      formatTransactionDateFilterLabel('before', ['2026-11-30'], TODAY)
    ).toBe('Before Nov 30, 2026');
  });
});

describe('migrateDateFilterValues', () => {
  it('expands single values into a range and collapses back', () => {
    expect(migrateDateFilterValues('is', 'between', ['2026-11-05'])).toEqual([
      '2026-11-05',
      '',
    ]);
    expect(
      migrateDateFilterValues('between', 'is', ['2026-11-05', '2026-11-09'])
    ).toEqual(['2026-11-05']);
  });

  it('keeps values within the same family', () => {
    const values = ['2026-11-01', '2026-11-09'];
    expect(migrateDateFilterValues('between', 'not_between', values)).toBe(
      values
    );
  });
});
