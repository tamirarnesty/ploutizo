import { useMemo } from 'react'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import type { Account } from '@ploutizo/types'
import type { TransactionFormInstance } from './hooks/useTransactionForm'

export interface ContributionFieldsProps {
  form: TransactionFormInstance
  accounts: Account[]
}

export const ContributionFields = ({ form, accounts }: ContributionFieldsProps) => {
  // Filter to investment accounts only (js-map-set: build once, lookup by id below)
  const investmentAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'investment'),
    [accounts],
  )

  // Build O(1) id→account map for the SelectValue display lookup (js-map-set)
  const accountMap = useMemo(
    () => new Map(investmentAccounts.map((a) => [a.id, a])),
    [investmentAccounts],
  )

  return (
    <form.AppField name="counterpartAccountId">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-contribution-counterpartAccountId">Account</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v)
            }}
          >
            <SelectTrigger id="tx-contribution-counterpartAccountId">
              <SelectValue>
                {(() => {
                  const a = accountMap.get(field.state.value)
                  // Format: "INVESTMENT — Account Name"
                  // Full "TYPE — MemberName" format deferred: Account type has no ownerMemberId;
                  // GET /api/accounts does not join account_members or org_members.
                  // Using "TYPE — AccountName" as substitute (account names typically include owner).
                  return a ? `${a.type.toUpperCase()} \u2014 ${a.name}` : 'Select account'
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {investmentAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {/* U+2014 em dash — TYPE — AccountName format */}
                  {`${a.type.toUpperCase()} \u2014 ${a.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.AppField>
  )
}
