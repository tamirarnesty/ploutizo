import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import {
  makeImportDraft,
  makeImportDraftRow,
} from '@/components/imports/test-fixtures/importDraft';
import { queryClient } from '@/lib/queryClient';
import {
  importMatchTransactionIdForDraft,
  sanitizeImportMatchPatch,
} from './importMatchTargetOnAccount';
import { importDraftQueryKey } from './queryKeys';

describe('importMatchTargetOnAccount', () => {
  const draft = makeImportDraft({
    id: 'draft_match_guard',
    matchTargetFacts: {
      tx_same: {
        id: 'tx_same',
        accountId: 'acct_1',
        type: 'expense',
        date: '2026-05-02',
        amount: 4218,
        description: 'Coffee',
        rawDescription: 'Coffee',
        externalId: 'visa-1001',
        deleted: false,
      },
      tx_other: {
        id: 'tx_other',
        accountId: 'acct_other',
        type: 'expense',
        date: '2026-05-02',
        amount: 4218,
        description: 'Other card',
        rawDescription: 'Other card',
        externalId: 'visa-9999',
        deleted: false,
      },
    },
    rows: [makeImportDraftRow()],
  });

  beforeEach(() => {
    queryClient.setQueryData(importDraftQueryKey(draft.id), draft);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('allows same-account match ids and rejects cross-account or unknown ids', () => {
    expect(importMatchTransactionIdForDraft(draft.id, 'tx_same')).toBe(
      'tx_same'
    );
    expect(importMatchTransactionIdForDraft(draft.id, 'tx_other')).toBeNull();
    expect(importMatchTransactionIdForDraft(draft.id, 'tx_missing')).toBeNull();
    expect(importMatchTransactionIdForDraft(draft.id, null)).toBeNull();
  });

  it('drops an invalid match id from a row patch and keeps a clear', () => {
    expect(
      sanitizeImportMatchPatch(draft.id, {
        reviewMatchedTransactionId: 'tx_other',
        reviewMatchDismissed: false,
      })
    ).toEqual({ reviewMatchDismissed: false });
    expect(
      sanitizeImportMatchPatch(draft.id, {
        reviewMatchedTransactionId: null,
      })
    ).toEqual({ reviewMatchedTransactionId: null });
    expect(
      sanitizeImportMatchPatch(draft.id, {
        reviewMatchedTransactionId: 'tx_same',
      } satisfies UpdateImportDraftRowInput)
    ).toEqual({ reviewMatchedTransactionId: 'tx_same' });
  });
});
