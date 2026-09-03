import { useUser } from '@clerk/tanstack-react-start';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ploutizo/ui/components/alert-dialog';
import { Archive } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Input } from '@ploutizo/ui/components/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Spinner } from '@ploutizo/ui/components/spinner';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import {
  AccountFormSchema,
  accountInstitutionViolation,
  persistAccountStatementDueDay,
  statementDueDaySchema,
} from '@ploutizo/validators';
import { useAppForm } from '@ploutizo/ui/components/form';
import {
  FINANCIAL_INSTITUTIONS,
  accountRequiresFinancialInstitution,
} from '@ploutizo/types';
import type {
  Account,
  AccountMember,
  FinancialInstitutionId,
  OrgMember,
} from '@ploutizo/types';
import type { AccountForm as AccountFormParsed } from '@ploutizo/validators';
import {
  useCreateAccount,
  useGetAccountMembers,
  useUpdateAccount,
} from '@/lib/data-access/accounts';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';

type AccountFormValues = Omit<AccountFormParsed, 'statementDueDay'> & {
  statementDueDay: string;
};

const OPTIONAL_INSTITUTION_SELECT_VALUE = '__none__';

const ACCOUNT_TYPES = [
  { value: 'chequing', label: 'Chequing' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'prepaid_cash', label: 'Prepaid / Cash' },
  { value: 'e_transfer', label: 'e-Transfer' },
  { value: 'investment', label: 'Investment' },
] as const;

interface AccountFormProps {
  account: Account | null;
  onClose: () => void;
  onArchive?: () => void;
}

interface AccountFormInnerProps {
  account: Account | null;
  existingMembers: AccountMember[];
  orgMembers: OrgMember[];
  onClose: () => void;
  onArchive?: () => void;
}

export const AccountForm = ({
  account,
  onClose,
  onArchive,
}: AccountFormProps) => {
  // Both queries fire simultaneously — no sequential waterfall (async-parallel rule)
  const { data: existingMembers, isLoading: membersLoading } =
    useGetAccountMembers(account?.id ?? null);
  const { data: orgMembers = [], isLoading: orgLoading } = useGetOrgMembers();

  if (membersLoading || orgLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AccountFormInner
      key={account?.id ?? 'new'}
      account={account}
      existingMembers={existingMembers ?? []}
      orgMembers={orgMembers}
      onClose={onClose}
      onArchive={onArchive}
    />
  );
};

const AccountFormInner = ({
  account,
  existingMembers,
  orgMembers,
  onClose,
  onArchive,
}: AccountFormInnerProps) => {
  const isEditing = account !== null;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount(account?.id ?? '');
  const { user } = useUser();
  const currentMemberId =
    orgMembers.find((m) => m.externalId === user?.id)?.id ?? null;

  const loadedMemberIds = existingMembers.map((m) => m.memberId);

  const form = useAppForm({
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? 'chequing',
      institutionId: account?.institutionId ?? null,
      lastFour: account?.lastFour ?? '',
      statementDueDay:
        account?.statementDueDay != null ? String(account.statementDueDay) : '',
      // Edit: restore saved members. Create: pre-select current user.
      memberIds: isEditing
        ? loadedMemberIds
        : currentMemberId
          ? [currentMemberId]
          : [],
    } as AccountFormValues,
    validators: {
      onSubmit: ({ value }: { value: AccountFormValues }) => {
        const result = AccountFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }: { value: AccountFormValues }) => {
      const result = AccountFormSchema.safeParse(value);
      if (!result.success) return;
      const payload = {
        name: result.data.name.trim(),
        type: result.data.type,
        institutionId: result.data.institutionId ?? null,
        lastFour: result.data.lastFour?.trim() || undefined,
        statementDueDay: persistAccountStatementDueDay(
          result.data.type,
          result.data.statementDueDay ?? null
        ),
        memberIds: result.data.memberIds,
      };
      const mutation = isEditing ? updateAccount : createAccount;
      mutation.mutate(payload, {
        onSuccess: onClose,
        onError: () =>
          form.setErrorMap({
            onSubmit:
              "Couldn't save changes. Check your connection and try again.",
          }),
      });
    },
  });

  return (
    <form
      className="flex flex-1 flex-col overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <FieldGroup>
          {/* Field 1: name */}
          <form.AppField
            name="name"
            validators={{ onChange: AccountFormSchema.shape.name }}
          >
            {(field) => (
              <Field
                data-invalid={field.state.meta.errors.length > 0 || undefined}
              >
                <FieldLabel htmlFor="account-name">Name</FieldLabel>
                <Input
                  id="account-name"
                  name="account-name"
                  autoComplete="off"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="e.g. Joint Chequing"
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

          {/* Field 2: type */}
          <form.AppField name="type">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="account-type">Account type</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as AccountFormValues['type'])
                  }
                >
                  <SelectTrigger id="account-type">
                    <SelectValue>
                      {(v: string) =>
                        ACCOUNT_TYPES.find((t) => t.value === v)?.label ?? v
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ACCOUNT_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.AppField>

          {/* Field 3: Financial institution catalog */}
          <form.Subscribe
            selector={(s: { values: AccountFormValues }) => s.values.type}
          >
            {(type) => {
              const required = accountRequiresFinancialInstitution(type);
              return (
                <form.AppField
                  name="institutionId"
                  validators={{
                    onSubmit: ({ value, fieldApi }) => {
                      const message = accountInstitutionViolation(
                        fieldApi.form.getFieldValue('type'),
                        value
                      );
                      return message ? { message } : undefined;
                    },
                  }}
                >
                  {(field) => (
                    <Field
                      data-invalid={
                        field.state.meta.errors.length > 0 || undefined
                      }
                    >
                      <FieldLabel htmlFor="account-institution">
                        {required
                          ? 'Financial institution'
                          : 'Financial institution (optional)'}
                      </FieldLabel>
                      <Select
                        value={
                          field.state.value ?? OPTIONAL_INSTITUTION_SELECT_VALUE
                        }
                        onValueChange={(value) =>
                          field.handleChange(
                            value === OPTIONAL_INSTITUTION_SELECT_VALUE
                              ? null
                              : (value as FinancialInstitutionId)
                          )
                        }
                      >
                        <SelectTrigger id="account-institution">
                          <SelectValue placeholder="Select a Financial institution">
                            {(value: string) =>
                              FINANCIAL_INSTITUTIONS.find(
                                (institution) => institution.id === value
                              )?.name ?? (required ? 'Select…' : 'None')
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {required ? null : (
                              <SelectItem
                                value={OPTIONAL_INSTITUTION_SELECT_VALUE}
                              >
                                None
                              </SelectItem>
                            )}
                            {FINANCIAL_INSTITUTIONS.map(({ id, name }) => (
                              <SelectItem key={id} value={id}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
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
              );
            }}
          </form.Subscribe>

          {/* Field 4: lastFour + statement due day (credit cards split evenly) */}
          <form.Subscribe
            selector={(s: { values: AccountFormValues }) => s.values.type}
          >
            {(type) => {
              const isCreditCard = type === 'credit_card';
              return (
                <div
                  data-testid="account-last-four-row"
                  className={cn(
                    'grid',
                    isCreditCard
                      ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4'
                      : 'grid-cols-[minmax(0,1fr)_0fr] gap-0',
                    'motion-safe:transition-[grid-template-columns,gap] motion-safe:duration-200'
                  )}
                >
                  <div className="min-w-0">
                    <form.AppField name="lastFour">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor="account-last-four">
                            Last 4 digits (optional)
                          </FieldLabel>
                          <Input
                            id="account-last-four"
                            name="account-last-four"
                            autoComplete="off"
                            value={field.state.value ?? ''}
                            onChange={(e) =>
                              field.handleChange(
                                e.target.value.replace(/\D/g, '').slice(0, 4)
                              )
                            }
                            onBlur={field.handleBlur}
                            placeholder="1234"
                            maxLength={4}
                            className="font-mono"
                          />
                        </Field>
                      )}
                    </form.AppField>
                  </div>
                  <div
                    data-testid="account-statement-due-day-wrap"
                    className={cn(
                      'min-w-0 overflow-hidden',
                      isCreditCard
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                      'motion-safe:transition-opacity motion-safe:duration-200'
                    )}
                    inert={!isCreditCard}
                    aria-hidden={!isCreditCard}
                  >
                    <form.AppField
                      name="statementDueDay"
                      validators={{
                        onSubmit: ({ value }) => {
                          const result = statementDueDaySchema.safeParse(
                            value === '' ? null : value
                          );
                          if (!result.success) {
                            return {
                              message: result.error.issues[0]?.message,
                            };
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.errors.length > 0 || undefined
                          }
                        >
                          <FieldLabel htmlFor="account-statement-due-day">
                            Statement due day (optional)
                          </FieldLabel>
                          <Input
                            id="account-statement-due-day"
                            name="account-statement-due-day"
                            autoComplete="off"
                            inputMode="numeric"
                            value={field.state.value}
                            onChange={(e) =>
                              field.handleChange(
                                e.target.value.replace(/\D/g, '').slice(0, 2)
                              )
                            }
                            onBlur={field.handleBlur}
                            placeholder="15"
                            maxLength={2}
                            className="font-mono"
                            aria-invalid={field.state.meta.errors.length > 0}
                          />
                          {field.state.meta.errors.length > 0 ? (
                            <FieldError
                              errors={
                                field.state.meta.errors as {
                                  message?: string;
                                }[]
                              }
                            />
                          ) : null}
                        </Field>
                      )}
                    </form.AppField>
                  </div>
                </div>
              );
            }}
          </form.Subscribe>

          {/* Field 5: owners — always multi-select */}
          <form.AppField
            name="memberIds"
            validators={{ onSubmit: AccountFormSchema.shape.memberIds }}
          >
            {(field) => (
              <Field
                data-invalid={field.state.meta.errors.length > 0 || undefined}
              >
                <FieldLabel>Owners</FieldLabel>
                <MemberToggleGroup
                  members={orgMembers}
                  value={field.state.value}
                  onChange={(ids) => field.handleChange(ids)}
                  ariaLabel="Owners"
                />
                {field.state.meta.errors.length > 0 ? (
                  <FieldError
                    errors={field.state.meta.errors as { message?: string }[]}
                  />
                ) : null}
              </Field>
            )}
          </form.AppField>

          {/* Form-level mutation error */}
          <form.Subscribe
            selector={(s: { errorMap: { onSubmit?: unknown } }) =>
              s.errorMap.onSubmit
            }
          >
            {(submitError) =>
              submitError ? (
                <Text variant="error">{String(submitError)}</Text>
              ) : null
            }
          </form.Subscribe>
        </FieldGroup>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
        {onArchive ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  type="button"
                  className="text-destructive hover:text-destructive"
                />
              }
            >
              <Archive size={16} className="mr-1" aria-hidden="true" />
              Archive
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive account?</AlertDialogTitle>
                <AlertDialogDescription>
                  Transactions linked to this account will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onArchive}>
                  Archive account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Discard
          </Button>
          <form.Subscribe
            selector={(s: { isSubmitting: boolean }) => s.isSubmitting}
          >
            {(isSubmitting) => (
              <LoadingButton type="submit" loading={isSubmitting}>
                {isEditing ? 'Save changes' : 'Add account'}
              </LoadingButton>
            )}
          </form.Subscribe>
        </div>
      </div>
    </form>
  );
};
