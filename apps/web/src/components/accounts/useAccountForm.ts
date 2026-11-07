import { useUser } from '@clerk/tanstack-react-start';
import {
  AccountFormSchema,
  accountFormFieldsSchema,
} from '@ploutizo/validators';
import type { AccountType } from '@ploutizo/types';
import type {
  Account,
  AccountForm,
  AccountFormValues,
  AccountMember,
  OrgMember,
} from '@ploutizo/validators';
import {
  schemaSubmitValidator,
  useEntityForm,
} from '@/lib/forms/useEntityForm';
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

  const { form } = useEntityForm<AccountFormValues, AccountForm>({
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
    validate: schemaSubmitValidator(accountFormFieldsSchema),
    toPayload: (value) => {
      const result = AccountFormSchema.safeParse(value);
      return result.success ? result.data : undefined;
    },
    create: createAccount,
    update: updateAccount,
    isEditing,
    onClose,
  });

  return { form, isEditing };
};

export type AccountFormInstance = ReturnType<typeof useAccountForm>['form'];
