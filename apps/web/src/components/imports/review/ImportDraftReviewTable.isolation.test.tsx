import '@/lib/access/working-set-cleanup';
import { useEffect, useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, OrgMember } from '@ploutizo/types';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { confirmPersistIntoCollection } from '@/lib/data-access/imports/persistImportDraftBatch';
import {
  endImportDraftRowsCollections,
  getImportDraftRowsCollection,
} from '@/lib/data-access/imports/getImportDraftRowsCollection';
import { importDraftQueryKey } from '@/lib/data-access/imports/queryKeys';
import { rederiveImportDraftWorkingCopy } from '@/lib/data-access/imports/rederiveImportDraftWorkingCopy';
import * as useImportReviewRowModule from '@/lib/data-access/imports/useImportReviewRow';
import type { Category } from '@/lib/data-access/categories';
import { HouseholdHookWrapper } from '@/test/household-hook-harness';
import { getImportRowLabel } from '../lib/importPresentation';
import { useImportDraftReviewState } from '../lib/useImportDraftReviewState';
import {
  DRAFT_ID,
  makeImportDraft,
  makeImportDraftRow,
} from '../test-fixtures/importDraft';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportDraftReviewTable } from './ImportDraftReviewTable';

vi.mock('@ploutizo/ui/components/date-picker', () => ({
  DatePicker: () => <div>Date picker</div>,
}));

vi.mock('@/components/currency/CurrencyInput', () => ({
  CurrencyInput: () => <input aria-label="Amount" />,
}));

vi.mock('@/components/categories/CategorySelect', () => ({
  CategorySelect: () => <div>Category select</div>,
}));

vi.mock('./ImportAssigneeField', () => ({
  ImportAssigneeField: () => <div>Assignee field</div>,
}));

vi.mock('@/lib/money/pending-input-flush', () => ({
  PendingInputFlushProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useFlushPendingInputs: () => vi.fn(),
  useRegisterInputFlush: () => undefined,
}));

vi.mock('@/hooks/persistedPageSize', () => ({
  usePersistedPageSize: () => ({
    pagination: { pageIndex: 0, pageSize: 25 },
    setPagination: vi.fn(),
  }),
}));

const defaultAccounts: Account[] = [
  {
    id: 'acct_1',
    orgId: 'org_1',
    name: 'Visa',
    type: 'credit_card',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '2026-05-20T12:00:00Z',
    updatedAt: '2026-05-20T12:00:00Z',
    owners: [],
  },
];

const defaultMembers = [
  {
    id: 'member_1',
    orgId: 'org_1',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00.000Z',
    externalId: 'user_1',
    email: 'tamir@example.com',
    firstName: 'Tamir',
    lastName: 'Arnesty',
    imageUrl: null,
  },
] satisfies OrgMember[];

const defaultCategories: Category[] = [
  {
    id: 'cat_1',
    orgId: 'org_1',
    name: 'Dining',
    icon: null,
    colour: null,
    sortOrder: 0,
    archivedAt: null,
    createdAt: '2026-05-20T12:00:00Z',
  },
];

const rowA = makeImportDraftRow({
  id: 'row_a',
  rowNumber: 2,
  reviewDescription: 'Coffee',
});

const rowB = makeImportDraftRow({
  id: 'row_b',
  rowNumber: 3,
  reviewDescription: 'Groceries',
});

const hydrateDraftRows = async (draftId: string, rows: (typeof rowA)[]) => {
  const draft = makeImportDraft({ id: draftId, rows });
  getActiveQueryClient().setQueryData(importDraftQueryKey(draftId), draft);
  const collection = getImportDraftRowsCollection(draftId);
  await collection.preload();
  rederiveImportDraftWorkingCopy(draftId);
  return collection;
};

const refreshSessionRowSnapshots = (
  sessionRows: (typeof rowA)[],
  onSessionRowsChange?: (rows: (typeof rowA)[]) => void
) => {
  const next = sessionRows.map((row) =>
    row.id === 'row_b'
      ? {
          ...row,
          updatedAt: '2026-05-21T12:00:00.000Z',
        }
      : { ...row }
  );
  onSessionRowsChange?.(next);
  return next;
};

const ReviewTableHarness = ({
  draftId,
  initialRows,
  onSessionRowsChange,
  sessionRowsRef,
  refreshSessionRowsRef,
}: {
  draftId: string;
  initialRows: (typeof rowA)[];
  onSessionRowsChange?: (rows: (typeof rowA)[]) => void;
  sessionRowsRef?: { current: (typeof rowA)[] };
  refreshSessionRowsRef?: { run: () => void };
}) => {
  const [sessionRows, setSessionRows] = useState(initialRows);
  if (sessionRowsRef) {
    sessionRowsRef.current = sessionRows;
  }
  useEffect(() => {
    if (!refreshSessionRowsRef) return;
    refreshSessionRowsRef.run = () => {
      setSessionRows((current) =>
        refreshSessionRowSnapshots(current, onSessionRowsChange)
      );
    };
  }, [onSessionRowsChange, refreshSessionRowsRef]);
  const meta = makeImportDraft({ id: draftId, rows: sessionRows });
  const reviewState = useImportDraftReviewState({
    meta,
    rows: sessionRows,
    setSelection: vi.fn(),
  });

  return (
    <ImportDraftReviewProvider
      draftId={draftId}
      cardAccountId="acct_1"
      accounts={defaultAccounts}
      categories={defaultCategories}
      orgMembers={defaultMembers}
      updateRow={vi.fn()}
    >
      <ImportDraftReviewTable draftId={draftId} reviewState={reviewState} />
    </ImportDraftReviewProvider>
  );
};

const renderIsolatedTable = async (
  props: {
    draftId?: string;
    rows?: (typeof rowA)[];
    onSessionRowsChange?: (rows: (typeof rowA)[]) => void;
    sessionRowsRef?: { current: (typeof rowA)[] };
    refreshSessionRowsRef?: { run: () => void };
  } = {}
) => {
  const draftId = props.draftId ?? DRAFT_ID;
  const rows = props.rows ?? [rowA, rowB];
  await hydrateDraftRows(draftId, rows);

  return render(
    <HouseholdHookWrapper>
      <TooltipProvider delay={0}>
        <ReviewTableHarness
          draftId={draftId}
          initialRows={rows}
          onSessionRowsChange={props.onSessionRowsChange}
          sessionRowsRef={props.sessionRowsRef}
          refreshSessionRowsRef={props.refreshSessionRowsRef}
        />
      </TooltipProvider>
    </HouseholdHookWrapper>
  );
};

describe('ImportDraftReviewTable row isolation', () => {
  const useImportReviewRowSpy = vi.spyOn(
    useImportReviewRowModule,
    'useImportReviewRow'
  );

  beforeEach(() => {
    getActiveQueryClient().clear();
    useImportReviewRowSpy.mockClear();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(async () => {
    await endImportDraftRowsCollections();
    getActiveQueryClient().clear();
  });

  it('subscribes once per visible row via row-level scope', async () => {
    await renderIsolatedTable();

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const subscribedRowIds = new Set(
      useImportReviewRowSpy.mock.calls.map((call) => call[1])
    );
    expect(subscribedRowIds).toEqual(new Set(['row_a', 'row_b']));
    expect(useImportReviewRowSpy.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('keeps an open type listbox when another row session snapshot changes', async () => {
    const user = userEvent.setup();
    const refreshSessionRowsRef = { run: () => {} };
    await renderIsolatedTable({ refreshSessionRowsRef });

    const typeTrigger = screen.getByRole('combobox', {
      name: `Type for ${getImportRowLabel(rowA)}`,
    });
    await user.click(typeTrigger);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    await act(async () => {
      refreshSessionRowsRef.run();
    });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('keeps an open type listbox after a no-op autosave ACK on another row', async () => {
    const user = userEvent.setup();
    const draftId = 'draft_isolation_ack';
    const collection = await hydrateDraftRows(draftId, [rowA, rowB]);

    await renderIsolatedTable({ draftId, rows: [rowA, rowB] });

    const typeTrigger = screen.getByRole('combobox', {
      name: `Type for ${getImportRowLabel(rowA)}`,
    });
    await user.click(typeTrigger);

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    const liveB = collection.get('row_b');
    if (!liveB) throw new Error('expected row_b in collection');

    await act(async () => {
      confirmPersistIntoCollection(
        collection,
        { row: { ...liveB } },
        liveB,
        liveB,
        { reviewDescription: liveB.reviewDescription },
        draftId,
        { skipRederive: true, skipRefundFacts: true }
      );
    });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
