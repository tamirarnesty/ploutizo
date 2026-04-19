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

/** Stable label string used as Combobox value and Map key */
const buildLabel = (tx: TransactionRow) =>
  `${tx.description ?? tx.merchant ?? '—'} \u2022 ${new Date(tx.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} \u2022 ${formatCurrency(tx.amount)}`;

export const RefundLinker = ({
  form,
  onAssigneesChange,
}: RefundLinkerProps) => {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  // Persists the selected transaction so its label stays visible after displayedResults changes
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
              className="ml-1 font-normal text-muted-foreground"
            >
              (optional)
            </Text>
          </FieldLabel>
          <Combobox
            value={selectedTx ? buildLabel(selectedTx) : null}
            onValueChange={(label: string | null) => {
              if (label) {
                const tx = resultsByLabel.get(label);
                if (tx) {
                  setSelectedTx(tx);
                  field.handleChange(tx.id);
                  // Gap 1: auto-fill description and amount from the linked transaction
                  form.setFieldValue(
                    'description',
                    'Refund of ' + (tx.description ?? tx.merchant ?? '')
                  );
                  // tx.amount is in cents; form stores dollars
                  form.setFieldValue('amount', tx.amount / 100);
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
                field.handleChange('');
                // D-17: clearing refundOf does NOT reset split
              }
            }}
            onInputValueChange={(q: string) => {
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
                {displayedResults.length === 0 ? (
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
