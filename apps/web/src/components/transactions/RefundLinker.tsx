import React, { useState } from 'react'
import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ploutizo/ui/components/combobox'
import { Spinner } from '@ploutizo/ui/components/spinner'
import type { AssigneeFormRow } from './types'
import type { useTransactionForm } from './hooks/useTransactionForm'
import { useSearchTransactions, useGetTransactions } from '@/lib/data-access/transactions'
import { formatCurrency } from '@/lib/formatCurrency'

export interface RefundLinkerProps {
  form: ReturnType<typeof useTransactionForm>['form']
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

export const RefundLinker = ({ form, onAssigneesChange }: RefundLinkerProps) => {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-load recent expense transactions for the dropdown before the user types
  const { data: recentExpensesResponse } = useGetTransactions({
    page: 1,
    limit: 10,
    sort: 'date',
    order: 'desc',
    type: 'expense',
  })
  const recentExpenses = recentExpensesResponse?.data ?? []

  const { data: searchResults = [], isLoading: searching } = useSearchTransactions(debouncedQuery)

  // Show search results when query is active, recent expenses otherwise
  const displayedResults = debouncedQuery.length >= 2 ? searchResults : recentExpenses

  // Build id→tx map from displayedResults for O(1) lookup in onValueChange
  const resultsById = React.useMemo(
    () => new Map(displayedResults.map((tx) => [tx.id, tx])),
    [displayedResults],
  )

  return (
    <form.AppField name="refundOf">
      {(field) => (
        <Field>
          <FieldLabel>
            Refund of{' '}
            <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
              (optional)
            </Text>
          </FieldLabel>
          <Combobox
            value={field.state.value || null}
            onValueChange={(v: string | null) => {
              field.handleChange(v ?? '')
              if (v) {
                const original = resultsById.get(v)
                if (original) {
                  onAssigneesChange(
                    original.assignees.map((a) => ({
                      memberId: a.memberId,
                      amountCents: a.amountCents,
                      percentage: a.percentage !== null ? parseFloat(a.percentage) : 0,
                    })),
                  )
                }
              }
              // D-17: clearing refundOf does NOT reset split — no else branch
            }}
            onInputValueChange={(q: string) => {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
              debounceTimerRef.current = setTimeout(() => setDebouncedQuery(q), 300)
            }}
          >
            <ComboboxInput placeholder="Search transactions…" showClear autoComplete="off" />
            <ComboboxContent>
              {searching ? (
                <div className="flex justify-center py-2">
                  <Spinner />
                </div>
              ) : null}
              <ComboboxList>
                {displayedResults.map((tx) => (
                  <ComboboxItem key={tx.id} value={tx.id}>
                    <span className="min-w-0 truncate">
                      {tx.description ?? tx.merchant ?? '—'} &bull;{' '}
                      {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      &bull; {formatCurrency(tx.amount)}
                    </span>
                  </ComboboxItem>
                ))}
              </ComboboxList>
              <ComboboxEmpty>No matching transactions found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </Field>
      )}
    </form.AppField>
  )
}
