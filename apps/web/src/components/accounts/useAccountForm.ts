import { useUser } from '@clerk/tanstack-react-start';
import { useAppForm } from '@ploutizo/ui/components/form';
import {
  AccountFormSchema,
  accountFormFieldsSchema,
} from '@ploutizo/validators';
import type { AccountType } from '@ploutizo/types';
import type {
  Account,
  AccountFormValues,
  AccountMember,
  OrgMember,
} from '@ploutizo/validators';
import { useCreateAccount, useUpdateAccount } from '@/lib/data-access/accounts';

interface UseAccountFormOptions {
  account: Account | null;
  defaultType?: AccountType;
  existingMembers: AccountMember[];
  orgMembers: OrgMember[];
  onClose: () => void;
}

export const useAccountForm = ({
  account,
  defaultType,
  existingMembers,
  orgMembers,
  onClose,
}: UseAccountFormOptions) => {
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
      type: account?.type ?? defaultType ?? 'chequing',
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
        const result = accountFormFieldsSchema.safeParse(value);
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(', ');
        }
      },
    },
    onSubmit: ({ value }: { value: AccountFormValues }) => {
      const result = AccountFormSchema.safeParse(value);
      if (!result.success) return;
      const mutation = isEditing ? updateAccount : createAccount;
      mutation.mutate(result.data, {
        onSuccess: onClose,
        onError: () =>
          form.setErrorMap({
            onSubmit:
              "Couldn't save changes. Check your connection and try again.",
          }),
      });
    },
  });

  return { form, isEditing };
};

export type AccountFormInstance = ReturnType<typeof useAccountForm>['form'];
