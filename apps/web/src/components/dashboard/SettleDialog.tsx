import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@ploutizo/ui/components/dialog';
import { Button } from '@ploutizo/ui/components/button';
import { Input } from '@ploutizo/ui/components/input';
import { Textarea } from '@ploutizo/ui/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@ploutizo/ui/components/input-group';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import { useAppForm } from '@ploutizo/ui/components/form';
import { settleFormSchema } from './settleFormSchema';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFormValues } from './settleFormSchema';
import { useCreateSettlement } from '@/lib/data-access/settlements';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { getSettleInitialValues } from '@/components/dashboard/settle-dialog/getSettleInitialValues';
import { SettleDialogSummary } from '@/components/dashboard/settle-dialog/SettleDialogSummary';
import { SettleMemberRadioList } from '@/components/dashboard/settle-dialog/SettleMemberRadioList';

export interface SettleDialogProps {
  open: boolean;
  account: SettlementAccountRow | null;
  onClose: () => void;
}

const EMPTY_VALUES: SettleFormValues = {
  payerMemberId: '',
  amountDollars: 0,
  sourceAccountId: '',
  date: '',
  notes: '',
};

export const SettleDialog = ({ open, account, onClose }: SettleDialogProps) => {
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
      ? getSettleInitialValues(account, firstSourceId, todayIso)
      : { ...EMPTY_VALUES, date: todayIso },
    validators: {
      onSubmit: ({ value }: { value: SettleFormValues }) => {
        const result = settleFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
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
    reset(getSettleInitialValues(account, firstSourceId, todayIso));
  }, [open, account, firstSourceId, todayIso, reset]);

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
                <Field
                  data-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <FieldLabel className="text-xs tracking-wider text-muted-foreground uppercase">
                    Settling for
                  </FieldLabel>
                  <SettleMemberRadioList
                    members={account.members}
                    value={field.state.value}
                    onValueChange={(next) => {
                      field.handleChange(next);
                      const picked = account.members.find(
                        (m) => m.member.id === next
                      );
                      if (picked) {
                        form.setFieldValue(
                          'amountDollars',
                          Math.abs(picked.balanceCents) / 100
                        );
                      }
                    }}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )}
            </form.AppField>

            <form.AppField
              name="amountDollars"
              validators={{ onChange: settleFormSchema.shape.amountDollars }}
            >
              {(field) => (
                <Field
                  data-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <div className="flex items-center justify-between">
                    <FieldLabel
                      htmlFor="settle-amount"
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                    >
                      Amount
                    </FieldLabel>
                    <Text
                      variant="caption"
                      className="text-xs text-muted-foreground"
                    >
                      Partial OK
                    </Text>
                  </div>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <InputGroupText>$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="settle-amount"
                      type="number"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0.00"
                      step="0.01"
                      value={
                        Number.isFinite(field.state.value)
                          ? String(field.state.value)
                          : ''
                      }
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        field.handleChange(Number.isFinite(v) ? v : 0);
                      }}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                  </InputGroup>
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
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
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel
                      htmlFor="settle-source"
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                    >
                      Paid from
                    </FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => v && field.handleChange(v)}
                    >
                      <SelectTrigger id="settle-source">
                        <SelectValue>
                          {sourceAccountOptions.find(
                            (a) => a.id === field.state.value
                          )?.name ?? 'Select account'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {sourceAccountOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )}
              </form.AppField>

              <form.AppField
                name="date"
                validators={{ onChange: settleFormSchema.shape.date }}
              >
                {(field) => (
                  <Field
                    data-invalid={
                      field.state.meta.errors.length > 0 || undefined
                    }
                  >
                    <FieldLabel
                      htmlFor="settle-date"
                      className="text-xs tracking-wider text-muted-foreground uppercase"
                    >
                      Date
                    </FieldLabel>
                    <Input
                      id="settle-date"
                      type="date"
                      autoComplete="off"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
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
                <Field
                  data-invalid={field.state.meta.errors.length > 0 || undefined}
                >
                  <FieldLabel
                    htmlFor="settle-notes"
                    className="text-xs tracking-wider text-muted-foreground uppercase"
                  >
                    Notes optional
                  </FieldLabel>
                  <Textarea
                    id="settle-notes"
                    rows={3}
                    autoComplete="off"
                    placeholder="Add a note…"
                    maxLength={1000}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )}
            </form.AppField>
          </FieldGroup>

          <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
            {(err) =>
              err ? (
                <Text variant="error" className="mt-3">
                  {String(err)}
                </Text>
              ) : null
            }
          </form.Subscribe>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Discard changes
            </Button>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  Record settlement
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
