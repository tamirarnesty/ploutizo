import React, { useState } from 'react';
import { useStore } from '@tanstack/react-form';
import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ploutizo/ui/components/combobox';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { formatCurrency } from '@ploutizo/utils/currency';
import type { TransactionRow } from '@ploutizo/validators';
import {
  useGetTransaction,
  useGetTransactions,
  useSearchTransactions,
} from '@/lib/data-access/transactions';
import {
  formAmountToCents,
  rescaleAssigneesForAmount,
  splitAssigneesEvenly,
} from './assigneeSplit';
import { formatTransactionDate } from './transactionRowDisplay';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

export interface RefundLinkerProps {
  form: TransactionFormInstance;
}

/** Stable unique key used as Combobox value for selection matching */
const buildLabel = (tx: TransactionRow) =>
  `${tx.description || '—'} \u2022 ${formatTransactionDate(tx.date)} \u2022 ${formatCurrency(tx.amount)}`;

/** Human-readable display name shown in the input after selection */
const buildDisplayName = (tx: TransactionRow) => tx.description || '—';

export const RefundLinker = ({ form }: RefundLinkerProps) => {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [pickedTx, setPickedTx] = useState<TransactionRow | null>(null);
  const [draftInput, setDraftInput] = useState<string | null>(null);
  const refundOf = useStore(form.store, (state) => state.values.refundOf);
  const { data: linkedOriginal } = useGetTransaction(refundOf || null);

  const linkedTx =
    refundOf && linkedOriginal?.id === refundOf ? linkedOriginal : null;
  const pickedMatchesRefund =
    pickedTx && refundOf && pickedTx.id === refundOf ? pickedTx : null;
  const selectedTx = pickedMatchesRefund ?? linkedTx;
  const inputValue =
    draftInput ?? (selectedTx ? buildDisplayName(selectedTx) : '');

  React.useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    []
  );

  const { data: recentExpensesResponse } = useGetTransactions({
    page: 1,
    limit: 10,
    sort: 'date',
    order: 'desc',
    type: 'expense',
  });
  const recentExpenses = recentExpensesResponse?.data ?? [];

  const { data: searchResults = [], isLoading: searching } =
    useSearchTransactions(debouncedQuery, 'expense');

  const displayedResults =
    debouncedQuery.length >= 2 ? searchResults : recentExpenses;

  // label → tx map for O(1) lookup in onValueChange
  const resultsByLabel = React.useMemo(
    () => new Map(displayedResults.map((tx) => [buildLabel(tx), tx])),
    [displayedResults]
  );

  return (
    <form.AppField name="refundOf">
      {(field) => (
        <Field>
          <FieldLabel>Refund of (optional)</FieldLabel>
          <Combobox
            value={selectedTx ? buildLabel(selectedTx) : null}
            inputValue={inputValue}
            onValueChange={(label: string | null) => {
              if (label) {
                const tx = resultsByLabel.get(label);
                if (tx) {
                  setPickedTx(tx);
                  setDraftInput(null);
                  // Reset query so re-opening shows recent expenses, not a stale bad search
                  if (debounceTimerRef.current)
                    clearTimeout(debounceTimerRef.current);
                  setDebouncedQuery('');
                  field.handleChange(tx.id);
                  // Auto-fill only empty fields — never overwrite user input or edit-mode values
                  const values = form.state.values;
                  if (!values.description.trim()) {
                    form.setFieldValue(
                      'description',
                      'Refund of ' + tx.description
                    );
                  }
                  const hadAmount = Boolean(values.amount);
                  if (!hadAmount) {
                    form.setFieldValue('amount', tx.amount / 100);
                  }
                  if (!values.accountId) {
                    form.setFieldValue('accountId', tx.accountId);
                  }
                  const amountCents = formAmountToCents(
                    form.getFieldValue('amount')
                  );
                  const memberIds = tx.assignees.map((a) => a.memberId);
                  if (values.assignees.length === 0) {
                    form.setFieldValue(
                      'assignees',
                      splitAssigneesEvenly(amountCents, memberIds)
                    );
                  } else if (!hadAmount) {
                    form.setFieldValue(
                      'assignees',
                      rescaleAssigneesForAmount(values.assignees, amountCents)
                    );
                  }
                }
              } else {
                setPickedTx(null);
                setDraftInput(null);
                setDebouncedQuery('');
                field.handleChange('');
                // D-17: clearing refundOf does NOT reset split
              }
            }}
            onInputValueChange={(q: string) => {
              setDraftInput(q);
              if (debounceTimerRef.current)
                clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = setTimeout(
                () => setDebouncedQuery(q),
                300
              );
            }}
          >
            <ComboboxInput
              placeholder="Search transactions…"
              showClear
              autoComplete="off"
            />
            <ComboboxContent>
              {searching ? (
                <div className="flex justify-center py-2">
                  <Spinner />
                </div>
              ) : null}
              <ComboboxList>
                {displayedResults.map((tx) => (
                  <ComboboxItem key={tx.id} value={buildLabel(tx)}>
                    <div className="flex w-full min-w-0 flex-col gap-0.5 py-0.5">
                      <span className="truncate font-medium">
                        {tx.description || '—'}
                      </span>
                      <span className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {new Date(tx.date + 'T00:00:00').toLocaleDateString(
                            'en-CA',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </span>
                        <span>{formatCurrency(tx.amount)}</span>
                      </span>
                    </div>
                  </ComboboxItem>
                ))}
                {/* Only show empty state when not loading — never show spinner + empty together */}
                {displayedResults.length === 0 && !searching ? (
                  <ComboboxEmpty>
                    {debouncedQuery.length >= 2
                      ? 'No matching transactions found.'
                      : 'No recent expense transactions found.'}
                  </ComboboxEmpty>
                ) : null}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
      )}
    </form.AppField>
  );
};
