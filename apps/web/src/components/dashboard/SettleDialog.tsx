import { useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@ploutizo/ui/components/dialog';
import { FieldGroup } from '@ploutizo/ui/components/field';
import { useAppForm } from '@ploutizo/ui/components/form';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFormSubmitValidatorArgs } from '@/components/dashboard/settle-dialog/settleDialogSubmitValidation';
import { getSettleInitialValues } from '@/components/dashboard/settle-dialog/getSettleInitialValues';
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
import { settleFormSchema } from './settleFormSchema';
import type { SettleFormValues } from './settleFormSchema';

export interface SettleDialogProps {
  open: boolean;
  account: SettlementAccountRow | null;
  onClose: () => void;
  /** Optional seed for `payerMemberId` — e.g. selected from Card Balances Action menu. */
  initialPayerMemberId?: string | null;
}

const EMPTY_VALUES: SettleFormValues = {
  payerMemberId: '',
  amountDollars: 0,
  sourceAccountId: '',
  date: '',
  notes: '',
};

export const SettleDialog = ({
  open,
  account,
  onClose,
  initialPayerMemberId,
}: SettleDialogProps) => {
  const createSettlement = useCreateSettlement();
  const { data: accounts = [] } = useGetAccounts();

  const todayIso = new Date().toLocaleDateString('en-CA');

  // Tracked bank-style accounts for "Paid from". Selection is validated in-form;
  // POST /api/settlements does not yet accept this field — no-op until follow-up.
  const sourceAccountOptions = useMemo(() => {
    const allowed = new Set<string>(['chequing', 'savings', 'prepaid_cash']);
    return accounts.filter(
      (a) =>
        a.id !== account?.account.id && allowed.has(a.type) && !a.archivedAt
    );
  }, [accounts, account?.account.id]);

  const firstSourceId = sourceAccountOptions[0]?.id ?? '';

  const form = useAppForm({
    defaultValues: account
      ? getSettleInitialValues(
          account,
          firstSourceId,
          todayIso,
          initialPayerMemberId
        )
      : { ...EMPTY_VALUES, date: todayIso },
    validators: {
      onSubmit: ({ value }: SettleFormSubmitValidatorArgs) =>
        getSettleFormSubmitValidationError(value),
    },
    onSubmit: ({ value }) => {
      if (!account) return;
      const amountCents = Math.round(value.amountDollars * 100);
      const trimmedNotes = value.notes?.trim() ?? '';
      // Follow-up: include `value.sourceAccountId` when createSettlement supports it.
      void value.sourceAccountId;
      createSettlement.mutate(
        {
          payerMemberId: value.payerMemberId,
          accountId: account.account.id,
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
      getSettleInitialValues(
        account,
        firstSourceId,
        todayIso,
        initialPayerMemberId
      )
    );
  }, [open, account, firstSourceId, todayIso, initialPayerMemberId, reset]);

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <SettleDialogSummary account={account} />

          <FieldGroup className="mt-4 space-y-5">
            <form.AppField
              name="payerMemberId"
              validators={{ onChange: settleFormSchema.shape.payerMemberId }}
            >
              {(field) => (
                <SettlePayerField
                  account={account}
                  value={field.state.value}
                  errors={field.state.meta.errors}
                  onPayerMemberChange={(memberId) => {
                    field.handleChange(memberId);
                    const picked = account.members.find(
                      (m) => m.member.id === memberId
                    );
                    if (picked) {
                      form.setFieldValue(
                        'amountDollars',
                        Math.abs(picked.balanceCents) / 100
                      );
                    }
                  }}
                />
              )}
            </form.AppField>

            <form.AppField
              name="amountDollars"
              validators={{ onChange: settleFormSchema.shape.amountDollars }}
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
            })}
          >
            {({ submitError, isSubmitting }) => (
              <SettleDialogFormFooter
                onClose={onClose}
                submitError={submitError}
                isSubmitting={isSubmitting}
              />
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
};
