import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTransactionFilterOptions } from './useTransactionFilterOptions';
import type { TransactionFilterReferenceData } from './transactionFilterTypes';

const referenceData = (
  overrides: Partial<TransactionFilterReferenceData> = {}
): TransactionFilterReferenceData => ({
  accounts: [{ id: 'acc_1', name: 'Everyday', type: 'chequing' }],
  categories: [{ id: 'cat_1', name: 'Groceries' }],
  members: [
    { id: 'mem_1', firstName: 'Ada', lastName: null, email: 'ada@example.com' },
  ],
  tags: [{ id: 'tag_1', name: 'Travel' }],
  loaded: true,
  ...overrides,
});

const selectionsFor = (
  search: Parameters<typeof useTransactionFilterOptions>[0],
  data = referenceData()
) =>
  renderHook(() => useTransactionFilterOptions(search, data)).result.current
    .selections;

describe('useTransactionFilterOptions', () => {
  it('parses selections from comma-joined URL values, dropping blanks and repeats', () => {
    const { category, tag } = selectionsFor({
      categoryId: 'cat_1,,cat_1',
      tagIds: 'tag_1,none',
    });
    expect(category.values).toEqual(['cat_1']);
    expect(tag.values).toEqual(['tag_1', 'none']);
  });

  it('labels options and the none sentinels', () => {
    const { category, tag, assignee } = selectionsFor({
      categoryId: 'cat_1,none',
      tagIds: 'none',
      assigneeId: 'mem_1,shared',
    });
    expect(category.labels.get('cat_1')).toBe('Groceries');
    expect(category.labels.get('none')).toBe('Uncategorized');
    expect(tag.labels.get('none')).toBe('No tags');
    expect(assignee.labels.get('mem_1')).toBe('Ada');
    expect(assignee.labels.get('shared')).toBe('Shared');
  });

  it('labels a selected id whose entity was deleted', () => {
    const { account, tag } = selectionsFor({
      accountId: 'acc_gone',
      tagIds: 'tag_gone',
    });
    expect(account.labels.get('acc_gone')).toBe('Deleted account');
    expect(tag.labels.get('tag_gone')).toBe('Deleted tag');
  });

  it('reads unresolved ids as loading until the reference data arrives', () => {
    const { account } = selectionsFor(
      { accountId: 'acc_1' },
      referenceData({ accounts: [], loaded: false })
    );
    expect(account.labels.get('acc_1')).toBe('Loading…');
  });

  it('groups accounts by type and skips empty groups', () => {
    const { account } = selectionsFor({});
    expect(account.groups.map((group) => group.label)).toEqual(['Chequing']);
  });
});
