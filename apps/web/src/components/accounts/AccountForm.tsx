import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Input } from '@ploutizo/ui/components/input';
import { Spinner } from '@ploutizo/ui/components/spinner';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import { SheetFooter } from '@ploutizo/ui/components/sheet';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import {
  AlertDialog,
  AlertDialogTrigger,
} from '@ploutizo/ui/components/alert-dialog';
import { Archive } from 'lucide-react';
import { accountFormFieldsSchema } from '@ploutizo/validators';
import type { AccountType } from '@ploutizo/types';
import type {
  Account,
  AccountFormValues,
  AccountMember,
  OrgMember,
} from '@ploutizo/validators';
import { DestructiveAlertDialogContent } from '@/components/DestructiveAlertDialogContent';
import { useGetAccountMembers } from '@/lib/data-access/accounts';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import { AccountInstitutionField } from './AccountInstitutionField';
import { AccountLastFourFields } from './AccountLastFourFields';
import { useAccountForm } from './useAccountForm';

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
  defaultType?: AccountType;
  onClose: () => void;
  onArchive?: () => void;
}

interface AccountFormInnerProps {
  account: Account | null;
  defaultType?: AccountType;
  existingMembers: AccountMember[];
  orgMembers: OrgMember[];
  onClose: () => void;
  onArchive?: () => void;
}

export const AccountForm = ({
  account,
  defaultType,
  onClose,
  onArchive,
}: AccountFormProps) => {
  // Both queries fire simultaneously — no sequential waterfall (async-parallel rule)
  const { data: existingMembers, isLoading: membersLoading } =
    useGetAccountMembers(account?.id ?? null);
  const { data: orgMembers = [], isLoading: orgLoading } =
    useGetHouseholdMembers();

  if (membersLoading || orgLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AccountFormInner
      key={account?.id ?? defaultType ?? 'new'}
      account={account}
      defaultType={defaultType}
      existingMembers={existingMembers ?? []}
      orgMembers={orgMembers}
      onClose={onClose}
      onArchive={onArchive}
    />
  );
};

const AccountFormInner = ({
  account,
  defaultType,
  existingMembers,
  orgMembers,
  onClose,
  onArchive,
}: AccountFormInnerProps) => {
  const { form, isEditing } = useAccountForm({
    account,
    defaultType,
    existingMembers,
    orgMembers,
    onClose,
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
            validators={{ onChange: accountFormFieldsSchema.shape.name }}
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

          <AccountInstitutionField form={form} />

          <AccountLastFourFields form={form} />

          {/* Field 5: owners — always multi-select */}
          <form.AppField
            name="memberIds"
            validators={{ onSubmit: accountFormFieldsSchema.shape.memberIds }}
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

      <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-6">
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
            <DestructiveAlertDialogContent
              title="Archive account?"
              description="Transactions linked to this account will not be affected."
              confirmLabel="Archive account"
              onConfirm={onArchive}
            />
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
      </SheetFooter>
    </form>
  );
};
