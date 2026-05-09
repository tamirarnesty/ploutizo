import { useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  RadioGroup,
  RadioGroupItem,
} from '@ploutizo/ui/components/radio-group';
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
import { cn } from '@ploutizo/ui/lib/utils';
import { settleFormSchema } from './settleFormSchema';
import type { SettlementAccountRow } from '@ploutizo/types';
import type { SettleFormValues } from './settleFormSchema';
import { useCreateSettlement } from '@/lib/data-access/settlements';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';

export interface SettleDialogProps {
  open: boolean;
  account: SettlementAccountRow | null; // null when dialog closed
  onClose: () => void;
}

// Derive stable initial values from the account — used on mount reset and effect re-seeds.
const getInitialValues = (
  account: SettlementAccountRow,
  firstSourceId: string,
  todayIso: string
): SettleFormValues => {
  const seedMember = account.members.find((m) => m.balanceCents > 0) ?? null;
  // Array.at(0) returns T | undefined (unlike [0] which returns T when strict mode sees a non-empty array type)
  const fallbackMember = account.members.at(0) ?? null;
  return {
    payerMemberId: seedMember
      ? seedMember.member.id
      : fallbackMember
        ? fallbackMember.member.id
        : '',
    amountDollars: seedMember
      ? Math.abs(seedMember.balanceCents) / 100
      : fallbackMember
        ? Math.abs(fallbackMember.balanceCents) / 100
        : 0,
    sourceAccountId: firstSourceId,
    date: todayIso,
    notes: '',
  };
};

export const SettleDialog = ({ open, account, onClose }: SettleDialogProps) => {
  const createSettlement = useCreateSettlement();
  const { data: accounts = [] } = useGetAccounts();

  // PAID FROM list: tracked bank-style accounts ONLY — must be a UUID the API recognizes.
  // Untracked options ("Cash", "E-Transfer", "Cheque", "Other") were intentionally dropped:
  // the POST /api/settlements API requires a real account UUID (Phase 4.1 D-03), so an
  // untracked string would be unsubmittable. If a user genuinely needs to record a
  // cash/e-transfer payment, they create a tracked Cash account first and select it here.
  // 'prepaid_cash' is the AccountType enum value for cash accounts (packages/db/src/schema/enums.ts).
  const sourceAccountOptions = useMemo(() => {
    const allowed = new Set<string>(['chequing', 'savings', 'prepaid_cash']);
    return accounts.filter(
      (a) =>
        a.id !== account?.account.id && allowed.has(a.type) && !a.archivedAt
    );
  }, [accounts, account?.account.id]);

  const todayIso = new Date().toLocaleDateString('en-CA');
  const firstSourceId = sourceAccountOptions[0]?.id ?? '';

  const form = useAppForm({
    defaultValues: account
      ? getInitialValues(account, firstSourceId, todayIso)
      : ({
          payerMemberId: '',
          amountDollars: 0,
          sourceAccountId: '',
          date: todayIso,
          notes: '',
        } satisfies SettleFormValues),
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
      // Strip empty notes so we don't send "" — the validator accepts it, but undefined
      // keeps DB rows clean. Plan 06's API persists notes onto the underlying transaction.
      const trimmedNotes = value.notes?.trim() ?? '';
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

  // Re-seed when dialog is open and account context changes: account id, first source
  // UUID, or local calendar date (todayIso updates after midnight).
  useEffect(() => {
    if (!open || !account) return;
    form.reset(getInitialValues(account, firstSourceId, todayIso));
  }, [open, account, firstSourceId, todayIso, form]);

  if (!account) return null;

  const totalLabel = formatCurrency(account.totalBalanceCents);
  const dueLabel = account.dueDate
    ? new Date(account.dueDate + 'T00:00:00').toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              <Text
                as="span"
                variant="h3"
              >{`Settle ${account.account.name}`}</Text>
            </DialogTitle>
            <DialogDescription>
              <Text
                as="span"
                variant="caption"
                className="text-muted-foreground"
              >
                {`Total balance: ${totalLabel}${dueLabel ? ` · Due ${dueLabel}` : ''}`}
              </Text>
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-4 space-y-5">
            {/* SETTLING FOR — radio cards */}
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
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(next) => {
                      field.handleChange(next);
                      // Auto-update amount field to the picked member's outstanding balance
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
                    className="space-y-2"
                  >
                    {[...account.members]
                      .sort((a, b) => b.balanceCents - a.balanceCents)
                      .map((m) => {
                        const isCredit = m.balanceCents < 0;
                        const isSelected = field.state.value === m.member.id;
                        return (
                          <label
                            key={m.member.id}
                            htmlFor={`settle-member-${m.member.id}`}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border'
                            )}
                          >
                            <RadioGroupItem
                              value={m.member.id}
                              id={`settle-member-${m.member.id}`}
                            />
                            <UserAvatar
                              name={m.member.name}
                              imageUrl={m.member.avatarUrl}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <Text
                                variant="body"
                                className="min-w-0 truncate font-semibold"
                              >
                                {m.member.name}
                              </Text>
                              <Text
                                variant="caption"
                                className={cn(
                                  isCredit
                                    ? 'text-success'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {`${formatCurrency(Math.abs(m.balanceCents))} ${isCredit ? 'credit' : 'outstanding'}`}
                              </Text>
                            </div>
                            <Text
                              as="span"
                              variant="body"
                              className={cn(
                                'shrink-0 font-sans font-semibold tabular-nums',
                                isCredit ? 'text-success' : 'text-foreground'
                              )}
                            >
                              {formatCurrency(Math.abs(m.balanceCents))}
                            </Text>
                          </label>
                        );
                      })}
                  </RadioGroup>
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError
                      errors={field.state.meta.errors as { message?: string }[]}
                    />
                  ) : null}
                </Field>
              )}
            </form.AppField>

            {/* AMOUNT */}
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
                    <FieldError
                      errors={field.state.meta.errors as { message?: string }[]}
                    />
                  ) : null}
                </Field>
              )}
            </form.AppField>

            {/* PAID FROM + DATE side-by-side */}
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
                        {/* Tracked bank-style accounts only. Untracked string options
                            (Cash/E-Transfer/Cheque/Other) are intentionally NOT surfaced
                            because the API requires a UUID accountId (Phase 4.1 D-03). */}
                        {sourceAccountOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 ? (
                      <FieldError
                        errors={
                          field.state.meta.errors as { message?: string }[]
                        }
                      />
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
                      <FieldError
                        errors={
                          field.state.meta.errors as { message?: string }[]
                        }
                      />
                    ) : null}
                  </Field>
                )}
              </form.AppField>
            </div>

            {/* NOTES OPTIONAL */}
            <form.AppField
              name="notes"
              validators={{
                // Use the inner ZodString validator (.unwrap()) so TanStack Form
                // resolves the field type as `string` not `string | undefined`.
                // The optional wrapping is only meaningful at the onSubmit level.
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
                    <FieldError
                      errors={field.state.meta.errors as { message?: string }[]}
                    />
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
