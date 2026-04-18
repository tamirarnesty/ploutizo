import React, { useState } from 'react'
import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ploutizo/ui/components/combobox'
import { Spinner } from '@ploutizo/ui/components/spinner'
import type { AssigneeFormRow } from './types'
import type { useTransactionForm } from './hooks/useTransactionForm'
import type { TransactionRow } from '@/lib/data-access/transactions'
import { useGetTransactions, useSearchTransactions } from '@/lib/data-access/transactions'
import { formatCurrency } from '@/lib/formatCurrency'

export interface RefundLinkerProps {
  form: ReturnType<typeof useTransactionForm>['form']
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

const txLabel = (tx: TransactionRow) =>
  `${tx.description ?? tx.merchant ?? '—'} \u2022 ${new Date(tx.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} \u2022 ${formatCurrency(tx.amount)}`

export const RefundLinker = ({ form, onAssigneesChange }: RefundLinkerProps) => {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Persists the selected transaction so its label stays visible after displayedResults changes
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null)

  const { data: recentExpensesResponse } = useGetTransactions({
    page: 1,
    limit: 10,
    sort: 'date',
    order: 'desc',
    type: 'expense',
  })
  const recentExpenses = recentExpensesResponse?.data ?? []

  const { data: searchResults = [], isLoading: searching } = useSearchTransactions(debouncedQuery)

  const displayedResults = debouncedQuery.length >= 2 ? searchResults : recentExpenses

  // label → tx map for O(1) lookup in onValueChange
  const resultsByLabel = React.useMemo(
    () => new Map(displayedResults.map((tx) => [txLabel(tx), tx])),
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
            value={selectedTx ? txLabel(selectedTx) : null}
            onValueChange={(label: string | null) => {
              if (label) {
                const tx = resultsByLabel.get(label)
                if (tx) {
                  setSelectedTx(tx)
                  field.handleChange(tx.id)
                  onAssigneesChange(
                    tx.assignees.map((a) => ({
                      memberId: a.memberId,
                      amountCents: a.amountCents,
                      percentage: a.percentage !== null ? parseFloat(a.percentage) : 0,
                    })),
                  )
                }
              } else {
                setSelectedTx(null)
                field.handleChange('')
                // D-17: clearing refundOf does NOT reset split
              }
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
                  <ComboboxItem key={tx.id} value={txLabel(tx)}>
                    <span className="min-w-0 truncate">{txLabel(tx)}</span>
                  </ComboboxItem>
                ))}
                {displayedResults.length === 0 ? (
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    {debouncedQuery.length >= 2
                      ? 'No matching transactions found.'
                      : 'No recent expense transactions found.'}
                  </div>
                ) : null}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
      )}
    </form.AppField>
  )
}
