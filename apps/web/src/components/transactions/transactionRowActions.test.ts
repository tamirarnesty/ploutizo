import { describe, expect, it, vi } from 'vitest';
import { mockTransactionRow } from '@/test/overlayFixtures';
import {
  getTransactionRowActions,
  resolveTransactionRowFromEventTarget,
} from './transactionRowActions';

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

describe('resolveTransactionRowFromEventTarget', () => {
  it('resolves the row from a body-cell click via the stamped id', () => {
    const transaction = mockTransactionRow();
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td><span id="desc">${transaction.description}</span></td>
            <td><div data-transaction-id="${transaction.id}"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    expect(
      resolveTransactionRowFromEventTarget(document.getElementById('desc'), [
        transaction,
      ])
    ).toEqual(transaction);
  });

  it('ignores header clicks', () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th id="header">Date</th></tr></thead>
        <tbody>
          <tr>
            <td>Coffee</td>
            <td><div data-transaction-id="tx-1"></div></td>
          </tr>
        </tbody>
      </table>
    `;

    expect(
      resolveTransactionRowFromEventTarget(document.getElementById('header'), [
        mockTransactionRow(),
      ])
    ).toBeNull();
  });
});
