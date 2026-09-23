import { describe, expect, it, vi } from 'vitest';
import { mockTransactionRow } from '@/test/overlayFixtures';
import { getTransactionRowActions } from './transactionRowActions';

describe('getTransactionRowActions', () => {
  it('returns Edit then Delete with shared labels and variants', () => {
    const actions = getTransactionRowActions(mockTransactionRow(), {
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(actions.map((action) => action.id)).toEqual(['edit', 'delete']);
    expect(actions.map((action) => action.label)).toEqual(['Edit', 'Delete']);
    expect(actions.map((action) => action.variant)).toEqual([
      'default',
      'destructive',
    ]);
  });

  it('wires Edit and Delete to the same handlers used by both menus', () => {
    const transaction = mockTransactionRow();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const [edit, remove] = getTransactionRowActions(transaction, {
      onEdit,
      onDelete,
    });

    edit.onSelect();
    remove.onSelect();

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(transaction);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(transaction.id);
  });
});
