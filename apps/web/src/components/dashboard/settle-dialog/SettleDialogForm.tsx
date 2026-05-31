import { useMemo } from 'react';
import { FieldGroup } from '@ploutizo/ui/components/field';
import { useAppForm } from '@ploutizo/ui/components/form';
import type { SettlementAccountRow } from '@ploutizo/types';
import {
  getSettleAmountForPayToward,
  getSettleInitialValues,
} from '@/components/dashboard/settle-dialog/getSettleInitialValues';
import { SettleAmountField } from '@/components/dashboard/settle-dialog/SettleAmountField';
import { SettleDateField } from '@/components/dashboard/settle-dialog/SettleDateField';
import { SettleDialogFormFooter } from '@/components/dashboard/settle-dialog/SettleDialogFormFooter';
import { SettleNotesField } from '@/components/dashboard/settle-dialog/SettleNotesField';
import { SettlePaidFromField } from '@/components/dashboard/settle-dialog/SettlePaidFromField';
import { SettlePayerField } from '@/components/dashboard/settle-dialog/SettlePayerField';
import { SettleDialogSummary } from '@/components/dashboard/settle-dialog/SettleDialogSummary';
import type {
  PayToward,
  SettleFormValues,
} from '@/components/dashboard/settleFormSchema';
import {
  settleAmountDollarsFieldSchema,
  settleFormSchema,
} from '@/components/dashboard/settleFormSchema';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { useCreateSettlement } from '@/lib/data-access/settlements';
import { getSettlementSourceAccounts } from '@/lib/settlements';

export type SettleDialogFormProps = {
  account: SettlementAccountRow;
  initialPayToward: PayToward;
  onClose: () => void;
};

export const SettleDialogForm = ({
  account,
  initialPayToward,
  onClose,
}: SettleDialogFormProps) => {
  const createSettlement = useCreateSettlement();
  const { data: accounts = [] } = useGetAccounts();
  const todayIso = new Date().toLocaleDateString('en-CA');

  const sourceAccountOptions = useMemo(
    () => getSettlementSourceAccounts(accounts, account.account.id),
    [accounts, account.account.id]
  );

  const form = useAppForm({
    defaultValues: getSettleInitialValues(
      account,
      accounts,
      todayIso,
      initialPayToward
    ),
    validators: {
      onSubmit: ({ value }: { value: SettleFormValues }) => {
        const result = settleFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: async ({ value }) => {
      const amountCents = Math.round(value.amountDollars * 100);
      const trimmedNotes = value.notes?.trim() ?? '';
      const assignees =
        value.payToward === 'shared'
          ? account.sharedParticipantIds.map((memberId) => ({ memberId }))
          : [{ memberId: value.payToward }];

      try {
        await createSettlement.mutateAsync({
          assignees,
          accountId: account.account.id,
          counterpartAccountId: value.sourceAccountId,
          amountCents,
          date: value.date,
          ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
        });
        onClose();
      } catch {
        form.setErrorMap({
          onSubmit:
            'Could not record settlement. Check your connection and try again.',
        });
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <SettleDialogSummary account={account} />

      <FieldGroup className="mt-4">
        <form.AppField name="payToward">
          {(field) => (
            <SettlePayerField
              account={account}
              value={field.state.value}
              errors={field.state.meta.errors}
              onPayTowardChange={(payToward) => {
                field.handleChange(payToward);
                form.setFieldValue(
                  'amountDollars',
                  getSettleAmountForPayToward(account, payToward)
                );
              }}
            />
          )}
        </form.AppField>

        <form.AppField
          name="amountDollars"
          validators={{ onChange: settleAmountDollarsFieldSchema }}
        >
          {(field) => (
            <SettleAmountField
              value={field.state.value}
              errors={field.state.meta.errors}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </form.AppField>

        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="sourceAccountId">
            {(field) => (
              <SettlePaidFromField
                sourceAccountOptions={sourceAccountOptions}
                value={field.state.value}
                errors={field.state.meta.errors}
                onValueChange={field.handleChange}
              />
            )}
          </form.AppField>

          <form.AppField name="date">
            {(field) => (
              <SettleDateField
                value={field.state.value}
                errors={field.state.meta.errors}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
              />
            )}
          </form.AppField>
        </div>

        <form.AppField name="notes">
          {(field) => (
            <SettleNotesField
              value={field.state.value ?? ''}
              errors={field.state.meta.errors}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </form.AppField>
      </FieldGroup>

      <form.Subscribe
        selector={(s) => ({
          submitError: s.errorMap.onSubmit,
          isSubmitting: s.isSubmitting,
          amountDollars: s.values.amountDollars,
        })}
      >
        {({ submitError, isSubmitting, amountDollars }) => (
          <SettleDialogFormFooter
            onClose={onClose}
            submitError={submitError}
            isSubmitting={isSubmitting}
            amountDollars={amountDollars}
          />
        )}
      </form.Subscribe>
    </form>
  );
};
