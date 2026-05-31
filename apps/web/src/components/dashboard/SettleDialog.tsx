import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@ploutizo/ui/components/dialog';
import { FieldGroup } from '@ploutizo/ui/components/field';
import { useAppForm } from '@ploutizo/ui/components/form';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { PayTowardTarget } from '@/components/dashboard/card-balances/types';
import type { SettleFormSubmitValidatorArgs } from '@/components/dashboard/settle-dialog/settleDialogSubmitValidation';
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
import { getSettleFormSubmitValidationError } from '@/components/dashboard/settle-dialog/settleDialogSubmitValidation';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { useCreateSettlement } from '@/lib/data-access/settlements';
import {
  settleAmountDollarsFieldSchema,
  settleFormSchema,
} from './settleFormSchema';
import type { SettleFormValues } from './settleFormSchema';

export interface SettleDialogProps {
  open: boolean;
  account: SettlementAccountRow | null;
  onClose: () => void;
  /** Pay-toward target from Card Balances action menu. */
  initialPayToward?: PayTowardTarget | null;
}

const EMPTY_VALUES: SettleFormValues = {
  payToward: 'shared',
  amountDollars: 0,
  sourceAccountId: '',
  date: '',
  notes: '',
};

export const SettleDialog = ({
  open,
  account,
  onClose,
  initialPayToward,
}: SettleDialogProps) => {
  const createSettlement = useCreateSettlement();
  const { data: accounts = [] } = useGetAccounts();

  const todayIso = new Date().toLocaleDateString('en-CA');

  const sourceAccountOptions = useMemo(() => {
    const allowed = new Set<string>(['chequing', 'savings', 'prepaid_cash']);
    return accounts.filter(
      (a) =>
        a.id !== account?.account.id && allowed.has(a.type) && !a.archivedAt
    );
  }, [accounts, account?.account.id]);

  const defaultPayToward = useMemo((): PayTowardTarget => {
    if (initialPayToward) return initialPayToward;
    const firstMember = account?.members.at(0);
    if (firstMember) {
      return { kind: 'member', memberId: firstMember.member.id };
    }
    return { kind: 'shared' };
  }, [initialPayToward, account]);

  const form = useAppForm({
    defaultValues: account
      ? getSettleInitialValues(account, accounts, todayIso, defaultPayToward)
      : { ...EMPTY_VALUES, date: todayIso },
    validators: {
      onSubmit: ({ value }: SettleFormSubmitValidatorArgs) =>
        getSettleFormSubmitValidationError(value),
    },
    onSubmit: ({ value }) => {
      if (!account) return;
      const amountCents = Math.round(value.amountDollars * 100);
      const trimmedNotes = value.notes?.trim() ?? '';
      const assignees =
        value.payToward === 'shared'
          ? account.sharedParticipantIds.map((memberId) => ({ memberId }))
          : [{ memberId: value.payToward }];

      createSettlement.mutate(
        {
          assignees,
          accountId: account.account.id,
          counterpartAccountId: value.sourceAccountId,
          amountCents,
          date: value.date,
          ...(trimmedNotes.length > 0 ? { notes: trimmedNotes } : {}),
        },
        {
          onSuccess: onClose,
          onError: () =>
            form.setErrorMap({
              onSubmit:
                'Could not record settlement. Check your connection and try again.',
            }),
        }
      );
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!open || !account) return;
    reset(
      getSettleInitialValues(account, accounts, todayIso, defaultPayToward)
    );
  }, [open, account, accounts, todayIso, defaultPayToward, reset]);

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <SettleDialogSummary account={account} />

          <FieldGroup className="mt-4">
            <form.AppField
              name="payToward"
              validators={{ onChange: settleFormSchema.shape.payToward }}
            >
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
              <form.AppField
                name="sourceAccountId"
                validators={{
                  onChange: settleFormSchema.shape.sourceAccountId,
                }}
              >
                {(field) => (
                  <SettlePaidFromField
                    sourceAccountOptions={sourceAccountOptions}
                    value={field.state.value}
                    errors={field.state.meta.errors}
                    onValueChange={field.handleChange}
                  />
                )}
              </form.AppField>

              <form.AppField
                name="date"
                validators={{ onChange: settleFormSchema.shape.date }}
              >
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

            <form.AppField
              name="notes"
              validators={{
                onChange: settleFormSchema.shape.notes.unwrap(),
              }}
            >
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
      </DialogContent>
    </Dialog>
  );
};
