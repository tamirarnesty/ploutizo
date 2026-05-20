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
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import { Text } from '@ploutizo/ui/components/text';
import { AccountFormSchema } from '@ploutizo/validators';
import { useAppForm } from '@ploutizo/ui/components/form';
import type { AccountForm as AccountFormType } from '@ploutizo/validators';
import type { Account, AccountMember, OrgMember } from '@ploutizo/types';
import {
  useCreateAccount,
  useGetAccountMembers,
  useUpdateAccount,
} from '@/lib/data-access/accounts';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';

const ACCOUNT_TYPES = [
  { value: 'chequing', label: 'Chequing' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'prepaid_cash', label: 'Prepaid / Cash' },
  { value: 'e_transfer', label: 'e-Transfer' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
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
      institution: account?.institution ?? '',
      lastFour: account?.lastFour ?? '',
      // personal = 1 owner (just me), shared = 2+ owners
      ownership:
        loadedMemberIds.length > 1
          ? ('shared' as const)
          : ('personal' as const),
      // Edit: restore saved members. Create: pre-select current user.
      memberIds: isEditing
        ? loadedMemberIds
        : currentMemberId
          ? [currentMemberId]
          : [],
    } as AccountFormType,
    validators: {
      onSubmit: ({ value }: { value: AccountFormType }) => {
        const result = AccountFormSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }: { value: AccountFormType }) => {
      const payload = {
        name: value.name.trim(),
        type: value.type,
        institution: value.institution?.trim() || undefined,
        lastFour: value.lastFour?.trim() || undefined,
        memberIds: value.memberIds,
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
          {/* Field 1: ownership */}
          <Field>
            <FieldLabel>Ownership</FieldLabel>
            <form.AppField name="ownership">
              {(field) => (
                <ToggleGroup
                  value={[field.state.value]}
                  onValueChange={(v) => {
                    const last = v[v.length - 1];
                    if (!last) return;
                    field.handleChange(last as 'personal' | 'shared');
                    if (last === 'personal') {
                      const memberIds = form.getFieldValue('memberIds');
                      if (memberIds.length > 1) {
                        form.setFieldValue('memberIds', [memberIds[0]]);
                      }
                    }
                  }}
                  variant="outline"
                >
                  <ToggleGroupItem value="personal" className="flex-1">
                    Personal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="shared" className="flex-1">
                    Shared
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </form.AppField>
          </Field>

          {/* Field 2: name */}
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

          {/* Field 3: type */}
          <form.AppField name="type">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="account-type">Account type</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange(v as AccountFormType['type'])
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

          {/* Field 4: institution */}
          <form.AppField name="institution">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="account-institution">
                  Institution (optional)
                </FieldLabel>
                <Input
                  id="account-institution"
                  name="account-institution"
                  autoComplete="organization"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="e.g. TD Bank"
                />
              </Field>
            )}
          </form.AppField>

          {/* Field 5: lastFour */}
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

          {/* Field 6: owner/co-owner selection — personal = single-select, shared = multi-select */}
          <form.Subscribe
            selector={(s: { values: AccountFormType }) => s.values.ownership}
          >
            {(ownership) => (
              <form.AppField name="memberIds">
                {(field) => (
                  <Field>
                    <FieldLabel>
                      {ownership === 'shared' ? 'Co-owners' : 'Owner'}
                    </FieldLabel>
                    <MemberToggleGroup
                      members={orgMembers}
                      value={field.state.value}
                      onChange={(ids) => field.handleChange(ids)}
                      multiple={ownership === 'shared'}
                    />
                  </Field>
                )}
              </form.AppField>
            )}
          </form.Subscribe>

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
