import { useEffect, useMemo, useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import { Textarea } from '@ploutizo/ui/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ploutizo/ui/components/combobox';
import { formatAccountLabel } from '@ploutizo/utils';
import { formatCurrency } from '@ploutizo/utils/currency';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
} from '@ploutizo/utils/import-row-status';
import type { ImportDraftRow } from '@ploutizo/types';
import { TransactionTagPicker } from '@/components/transactions/TransactionTagPicker';
import {
  useGetTransaction,
  useGetTransactions,
  useSearchTransactions,
} from '@/lib/data-access/transactions';
import type { TransactionRow } from '@/lib/data-access/transactions';
import {
  isRefundImportRow,
  isSettlementImportRow,
} from '../lib/importClassification';
import { getImportRowLabel } from '../lib/importPresentation';
import { useImportDraftReviewContext } from './ImportDraftReviewContext';
import { useImportDraftReviewRowSave } from './useImportDraftReviewRowSave';

interface ImportDraftReviewRowDetailsProps {
  row: ImportDraftRow;
}

const existingRefundValue = (id: string) => `existing:${id}`;
const sameImportRefundValue = (id: string) => `same-import:${id}`;

const buildExpenseLabel = (
  tx: Pick<TransactionRow, 'description' | 'date' | 'amount'>
) => `${tx.description || '—'} · ${tx.date} · ${formatCurrency(tx.amount)}`;

const buildSameImportLabel = (target: ImportDraftRow) => {
  const description =
    resolveImportRowReviewDescription(target) ?? `Row ${target.rowNumber}`;
  const amount = resolveImportRowReviewAmount(target);
  const amountLabel = amount != null ? formatCurrency(amount) : '—';
  return `${description} · same import · ${amountLabel}`;
};

const buildUnavailableExistingLabel = (id: string) =>
  `Linked expense (unavailable) · ${id.slice(0, 8)}`;

export const ImportDraftReviewRowDetails = ({
  row,
}: ImportDraftReviewRowDetailsProps) => {
  const { accounts, draftRows, accountId } = useImportDraftReviewContext();
  const { saveField, disabled } = useImportDraftReviewRowSave(row);
  const [notesDraft, setNotesDraft] = useState(() => row.reviewNotes ?? '');
  const [refundQuery, setRefundQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const rowLabel = getImportRowLabel(row);
  const tagsInputId = `import-row-tags-${row.id}`;
  const settlement = isSettlementImportRow(row);
  const refund = isRefundImportRow(row);

  useEffect(() => {
    setNotesDraft(row.reviewNotes ?? '');
  }, [row.id, row.reviewNotes]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(refundQuery), 300);
    return () => clearTimeout(timer);
  }, [refundQuery]);

  const fundingAccounts = useMemo(
    () => accounts.filter((account) => account.id !== accountId),
    [accounts, accountId]
  );

  const linkedSameImportRow = useMemo(
    () =>
      draftRows.find(
        (candidate) => candidate.id === row.reviewRefundOfBatchRowId
      ) ?? null,
    [draftRows, row.reviewRefundOfBatchRowId]
  );

  const sameImportExpenses = useMemo(() => {
    const expenses = draftRows.filter(
      (candidate) =>
        candidate.id !== row.id &&
        resolveImportRowReviewType(candidate) === 'expense'
    );
    // Keep an invalid/unfinalizable same-import target visible after type flips.
    if (
      linkedSameImportRow &&
      linkedSameImportRow.id !== row.id &&
      !expenses.some((candidate) => candidate.id === linkedSameImportRow.id)
    ) {
      return [linkedSameImportRow, ...expenses];
    }
    return expenses;
  }, [draftRows, linkedSameImportRow, row.id]);

  const { data: recentExpensesResponse } = useGetTransactions({
    page: 1,
    limit: 10,
    sort: 'date',
    order: 'desc',
    type: 'expense',
    accountId,
  });
  const recentExpenses = recentExpensesResponse?.data ?? [];
  const { data: searchResults = [] } = useSearchTransactions(
    debouncedQuery,
    'expense'
  );
  const linkedExistingQuery = useGetTransaction(row.reviewRefundOf);
  const linkedExistingExpense = linkedExistingQuery.data;
  const linkedExistingUnavailable =
    Boolean(row.reviewRefundOf) &&
    linkedExistingQuery.isFetched &&
    !linkedExistingQuery.isLoading &&
    !linkedExistingExpense;

  const existingExpenses = (
    debouncedQuery.trim().length >= 2 ? searchResults : recentExpenses
  ).filter((tx) => tx.accountId === accountId);

  // Keep an invalid/unfinalizable saved target visible even when it is absent
  // from recent/search results (deleted, wrong account, or off the first page).
  const existingExpenseOptions = (() => {
    if (!linkedExistingExpense) return existingExpenses;
    if (existingExpenses.some((tx) => tx.id === linkedExistingExpense.id)) {
      return existingExpenses;
    }
    return [linkedExistingExpense, ...existingExpenses];
  })();

  const selectedExisting = existingExpenseOptions.find(
    (tx) => tx.id === row.reviewRefundOf
  );
  const selectedSameImport = sameImportExpenses.find(
    (candidate) => candidate.id === row.reviewRefundOfBatchRowId
  );

  const refundComboboxValue = selectedExisting
    ? existingRefundValue(selectedExisting.id)
    : selectedSameImport
      ? sameImportRefundValue(selectedSameImport.id)
      : linkedExistingUnavailable && row.reviewRefundOf
        ? existingRefundValue(row.reviewRefundOf)
        : null;

  return (
    <div className="bg-muted/10 px-3 py-2">
      <div className="grid min-w-[760px] grid-cols-[minmax(420px,2fr)_minmax(260px,1fr)] items-start gap-4">
        <div className="min-w-0 space-y-3">
          {settlement ? (
            <div className="min-w-0">
              <Text
                as="label"
                htmlFor={`import-row-funding-${row.id}`}
                variant="body-sm"
                className="mb-1.5 block font-medium"
              >
                Funding account
              </Text>
              <Select
                value={row.reviewCounterpartAccountId ?? ''}
                disabled={disabled}
                onValueChange={(next) => {
                  const nextId = next || null;
                  if (nextId === row.reviewCounterpartAccountId) return;
                  saveField({ reviewCounterpartAccountId: nextId });
                }}
              >
                <SelectTrigger
                  id={`import-row-funding-${row.id}`}
                  className="w-full max-w-md"
                  aria-label={`Funding account for ${rowLabel}`}
                >
                  <SelectValue>
                    {row.reviewCounterpartAccountId
                      ? formatAccountLabel(
                          fundingAccounts.find(
                            (account) =>
                              account.id === row.reviewCounterpartAccountId
                          ) ??
                            accounts.find(
                              (account) =>
                                account.id === row.reviewCounterpartAccountId
                            ) ?? {
                              name: 'Selected account',
                              institution: null,
                              lastFour: null,
                            }
                        )
                      : 'Select funding account'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {fundingAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {formatAccountLabel(account)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Text variant="body-sm" className="mt-1 text-muted-foreground">
                Pay toward uses the Assignee column for this settlement.
              </Text>
            </div>
          ) : null}

          {refund ? (
            <div className="min-w-0">
              <Text
                as="label"
                variant="body-sm"
                className="mb-1.5 block font-medium"
              >
                Refund of
              </Text>
              <Combobox
                value={refundComboboxValue}
                inputValue={refundQuery}
                onValueChange={(value: string | null) => {
                  if (!value) {
                    setRefundQuery('');
                    saveField({
                      reviewRefundOf: null,
                      reviewRefundOfBatchRowId: null,
                    });
                    return;
                  }

                  if (value.startsWith('existing:')) {
                    const id = value.slice('existing:'.length);
                    const existing = existingExpenseOptions.find(
                      (tx) => tx.id === id
                    );
                    if (!existing) {
                      // Keep unavailable linked targets selectable for clear/replace.
                      setRefundQuery(buildUnavailableExistingLabel(id));
                      saveField({
                        reviewRefundOf: id,
                        reviewRefundOfBatchRowId: null,
                      });
                      return;
                    }
                    setRefundQuery(existing.description || '—');
                    saveField({
                      reviewRefundOf: existing.id,
                      reviewRefundOfBatchRowId: null,
                      reviewCategoryId: existing.categoryId,
                      reviewAssigneeMemberIds: existing.assignees.map(
                        (assignee) => assignee.memberId
                      ),
                    });
                    return;
                  }

                  if (value.startsWith('same-import:')) {
                    const id = value.slice('same-import:'.length);
                    const sameImport = sameImportExpenses.find(
                      (candidate) => candidate.id === id
                    );
                    if (!sameImport) return;
                    setRefundQuery(
                      resolveImportRowReviewDescription(sameImport) ??
                        `Row ${sameImport.rowNumber}`
                    );
                    saveField({
                      reviewRefundOf: null,
                      reviewRefundOfBatchRowId: sameImport.id,
                      reviewCategoryId: sameImport.reviewCategoryId,
                      reviewAssigneeMemberIds: [
                        ...sameImport.reviewAssigneeMemberIds,
                      ],
                    });
                  }
                }}
                onInputValueChange={setRefundQuery}
              >
                <ComboboxInput
                  placeholder="Link an expense…"
                  showClear
                  autoComplete="off"
                  disabled={disabled}
                  aria-label={`Refund link for ${rowLabel}`}
                />
                <ComboboxContent>
                  <ComboboxList>
                    {sameImportExpenses.map((candidate) => {
                      const label = buildSameImportLabel(candidate);
                      return (
                        <ComboboxItem
                          key={`row-${candidate.id}`}
                          value={sameImportRefundValue(candidate.id)}
                        >
                          {label}
                        </ComboboxItem>
                      );
                    })}
                    {linkedExistingUnavailable && row.reviewRefundOf ? (
                      <ComboboxItem
                        key={`tx-unavailable-${row.reviewRefundOf}`}
                        value={existingRefundValue(row.reviewRefundOf)}
                      >
                        {buildUnavailableExistingLabel(row.reviewRefundOf)}
                      </ComboboxItem>
                    ) : null}
                    {existingExpenseOptions.map((tx) => (
                      <ComboboxItem
                        key={`tx-${tx.id}`}
                        value={existingRefundValue(tx.id)}
                      >
                        {buildExpenseLabel(tx)}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>No matching expenses.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
              {row.reviewRefundLinkHint ? (
                <Text variant="body-sm" className="mt-1 text-muted-foreground">
                  CSV hint: {row.reviewRefundLinkHint}
                </Text>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0">
            <Text
              as="label"
              htmlFor={`import-row-notes-${row.id}`}
              variant="body-sm"
              className="mb-1.5 block font-medium"
            >
              Notes
            </Text>
            <Textarea
              id={`import-row-notes-${row.id}`}
              aria-label={`Notes for ${rowLabel}`}
              value={notesDraft}
              disabled={disabled}
              rows={1}
              className="h-10 min-h-10 w-full resize-y"
              autoComplete="off"
              placeholder="Add a note…"
              onChange={(event) => {
                const raw = event.currentTarget.value;
                setNotesDraft(raw);
                const next = raw.trim() || null;
                if (next === row.reviewNotes) return;
                saveField({ reviewNotes: next });
              }}
            />
          </div>
        </div>
        <div className="min-w-0">
          <Text
            as="label"
            htmlFor={tagsInputId}
            variant="body-sm"
            className="mb-1.5 block font-medium"
          >
            Tags
          </Text>
          <TransactionTagPicker
            value={row.reviewTagIds}
            allowCreate={false}
            disabled={disabled}
            inputId={tagsInputId}
            inputAriaLabel={`Tags for ${rowLabel}`}
            onChange={(nextTagIds) => {
              if (nextTagIds.join('|') === row.reviewTagIds.join('|')) {
                return;
              }
              saveField({ reviewTagIds: nextTagIds });
            }}
          />
        </div>
      </div>
    </div>
  );
};
