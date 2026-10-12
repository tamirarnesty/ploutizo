import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '@ploutizo/validators';
import { useTransactionDescriptionLock } from './useTransactionDescriptionLock';
import { useTransactionForm } from './useTransactionForm';

vi.mock('@/lib/data-access/transactions', () => ({
  useGetTransaction: () => ({ data: undefined }),
}));

const accounts: Account[] = [
  {
    id: 'acct-a',
    orgId: 'org-1',
    name: 'Chequing',
    type: 'chequing',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
  {
    id: 'acct-b',
    orgId: 'org-1',
    name: 'Savings',
    type: 'savings',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
  },
];

const createMutation = { mutate: vi.fn() } as never;
const updateMutation = { mutate: vi.fn() } as never;

const useLockHarness = () => {
  const { form } = useTransactionForm({
    transaction: null,
    accounts,
    orgMembers: [],
    onClose: vi.fn(),
    createMutation,
    updateMutation,
  });
  const lock = useTransactionDescriptionLock({
    form,
    accounts,
    transaction: null,
  });
  return { form, lock };
};

describe('useTransactionDescriptionLock', () => {
  it('locks transfer descriptions and writes the generated template', async () => {
    const { result } = renderHook(() => useLockHarness());

    act(() => {
      result.current.form.setFieldValue('type', 'transfer');
      result.current.form.setFieldValue('accountId', 'acct-a');
      result.current.form.setFieldValue('counterpartAccountId', 'acct-b');
    });

    await waitFor(() => {
      expect(result.current.lock.isLocked).toBe(true);
      expect(result.current.form.state.values.description).toContain(
        'Chequing'
      );
    });
  });

  it('unlocks when the user chooses to edit', async () => {
    const { result } = renderHook(() => useLockHarness());

    act(() => {
      result.current.form.setFieldValue('type', 'transfer');
      result.current.form.setFieldValue('accountId', 'acct-a');
      result.current.form.setFieldValue('counterpartAccountId', 'acct-b');
    });

    await waitFor(() => {
      expect(result.current.lock.isLocked).toBe(true);
    });

    act(() => {
      result.current.lock.unlockDescription();
    });

    await waitFor(() => {
      expect(result.current.lock.isLocked).toBe(false);
    });
  });

  it('clears a manual unlock when the transaction type changes', async () => {
    const { result } = renderHook(() => useLockHarness());

    act(() => {
      result.current.form.setFieldValue('type', 'transfer');
      result.current.form.setFieldValue('accountId', 'acct-a');
      result.current.form.setFieldValue('counterpartAccountId', 'acct-b');
    });

    await waitFor(() => {
      expect(result.current.lock.isLocked).toBe(true);
    });

    act(() => {
      result.current.lock.unlockDescription();
    });

    await waitFor(() => {
      expect(result.current.lock.isLocked).toBe(false);
    });

    act(() => {
      result.current.form.setFieldValue('type', 'expense');
    });

    act(() => {
      result.current.form.setFieldValue('type', 'transfer');
      result.current.form.setFieldValue('accountId', 'acct-b');
      result.current.form.setFieldValue('counterpartAccountId', 'acct-a');
    });

    await waitFor(() => {
      expect(result.current.lock.isLocked).toBe(true);
    });
  });
});
