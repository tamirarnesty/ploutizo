import React, { useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
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
import type { AssigneeFormRow } from './types';
import type { TransactionFormInstance } from './hooks/useTransactionForm';
import type { TransactionRow } from '@/lib/data-access/transactions';
import {
  useGetTransactions,
  useSearchTransactions,
} from '@/lib/data-access/transactions';
import { formatCurrency } from '@/lib/formatCurrency';

export interface RefundLinkerProps {
  form: TransactionFormInstance;
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void;
}

/** Stable unique key used as Combobox value for selection matching */
const buildLabel = (tx: TransactionRow) =>
  `${tx.description ?? tx.merchant ?? '—'} \u2022 ${new Date(tx.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} \u2022 ${formatCurrency(tx.amount)}`;

/** Human-readable display name shown in the input after selection */
const buildDisplayName = (tx: TransactionRow) =>
  tx.description ?? tx.merchant ?? '—';

export const RefundLinker = ({
  form,
  onAssigneesChange,
}: RefundLinkerProps) => {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);

  const { data: recentExpensesResponse } = useGetTransactions({
    page: 1,
    limit: 10,
    sort: 'date',
    order: 'desc',
    type: 'expense',
  });
  const recentExpenses = recentExpensesResponse?.data ?? [];

  const { data: searchResults = [], isLoading: searching } =
    useSearchTransactions(debouncedQuery);

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
          <FieldLabel>
            Refund of
            <Text
              as="span"
              variant="body-sm"
              className="font-normal text-muted-foreground"
            >
              (optional)
            </Text>
          </FieldLabel>
          <Combobox
            value={selectedTx ? buildLabel(selectedTx) : null}
            inputValue={inputValue}
            onValueChange={(label: string | null) => {
              if (label) {
                const tx = resultsByLabel.get(label);
                if (tx) {
                  setSelectedTx(tx);
                  // Show only name in input — not the full "name • date • amount" key
                  setInputValue(buildDisplayName(tx));
                  // Reset query so re-opening shows recent expenses, not a stale bad search
                  if (debounceTimerRef.current)
                    clearTimeout(debounceTimerRef.current);
                  setDebouncedQuery('');
                  field.handleChange(tx.id);
                  // Auto-fill only empty fields — never overwrite user input or edit-mode values
                  const values = form.state.values;
                  if (!values.description?.trim()) {
                    form.setFieldValue(
                      'description',
                      'Refund of ' + (tx.description ?? tx.merchant ?? '')
                    );
                  }
                  if (!values.amount) {
                    form.setFieldValue('amount', tx.amount / 100);
                  }
                  if (!values.accountId) {
                    form.setFieldValue('accountId', tx.accountId);
                  }
                  onAssigneesChange(
                    tx.assignees.map((a) => ({
                      memberId: a.memberId,
                      amountCents: a.amountCents,
                      percentage:
                        a.percentage !== null ? parseFloat(a.percentage) : 0,
                    }))
                  );
                }
              } else {
                setSelectedTx(null);
                setInputValue('');
                setDebouncedQuery('');
                field.handleChange('');
                // D-17: clearing refundOf does NOT reset split
              }
            }}
            onInputValueChange={(q: string) => {
              setInputValue(q);
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
                        {tx.description ?? tx.merchant ?? '—'}
                      </span>
                      <span className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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
