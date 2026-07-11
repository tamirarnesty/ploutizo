import type { TransactionType } from '@ploutizo/types';
import {
  ACCOUNT_ROLE_POLICIES,
  TRANSACTION_ACCOUNT_FIELDS,
  TRANSACTION_SCALAR_FIELDS,
  TRANSACTION_TYPE_POLICIES,
} from './policies';
import type {
  GetAccountOptionsForTransactionSlotInput,
  ResolveTransactionDescriptionPolicyInput,
  ResolvedTransactionDescriptionPolicy,
  TransactionAccountOption,
  TransactionAccountSlot,
  TransactionTypePolicyReadModel,
  ValidateTransactionAccountPolicyInput,
  ValidateTransactionAccountPolicyResult,
} from './types';

const expandAccountSlot = (
  slot: (typeof TRANSACTION_TYPE_POLICIES)[TransactionType]['accountSlots'][number]
) => ({
  field: slot.field,
  role: slot.role,
  required: slot.required,
  allowedAccountTypes: ACCOUNT_ROLE_POLICIES[slot.role].allowedAccountTypes,
  relationshipRules: slot.relationshipRules ?? [],
});

export const getTransactionTypePolicy = (
  type: TransactionType
): TransactionTypePolicyReadModel => {
  const policy = TRANSACTION_TYPE_POLICIES[type];
  return {
    type,
    accountSlots: policy.accountSlots.map(expandAccountSlot),
    scalarFields: policy.scalarFields,
    description: policy.description,
  };
};

export const resolveTransactionDescriptionPolicy = (
  input: ResolveTransactionDescriptionPolicyInput
): ResolvedTransactionDescriptionPolicy => {
  const { description } = TRANSACTION_TYPE_POLICIES[input.type];

  if (description.mode === 'manual') {
    return { mode: 'manual' };
  }

  if (description.mode === 'generated') {
    return { mode: 'generated' };
  }

  if (description.source === 'linked_refund') {
    return { mode: input.refundOf ? 'generated' : 'manual' };
  }

  return { mode: 'generated' };
};

export const getTransactionFieldsToClear = (
  type: TransactionType
): readonly string[] => {
  const policy = TRANSACTION_TYPE_POLICIES[type];
  const relevantScalarFields = new Set(Object.keys(policy.scalarFields));
  const relevantAccountFields = new Set(
    policy.accountSlots.map((slot) => slot.field)
  );

  const scalarFieldsToClear = TRANSACTION_SCALAR_FIELDS.filter(
    (field) => !relevantScalarFields.has(field)
  );
  const accountFieldsToClear = TRANSACTION_ACCOUNT_FIELDS.filter(
    (field) => !relevantAccountFields.has(field)
  );

  return [...scalarFieldsToClear, ...accountFieldsToClear];
};

const getSlotPolicy = (
  type: TransactionType,
  slot: TransactionAccountSlot
) => {
  const policy = TRANSACTION_TYPE_POLICIES[type];
  return policy.accountSlots.find((accountSlot) => accountSlot.field === slot);
};

const isArchivedAccount = (account: TransactionAccountOption): boolean =>
  account.archivedAt !== null;

export const getAccountOptionsForTransactionSlot = (
  input: GetAccountOptionsForTransactionSlotInput
): TransactionAccountOption[] => {
  const slotPolicy = getSlotPolicy(input.type, input.slot);
  if (!slotPolicy) return [];

  const allowedTypes = ACCOUNT_ROLE_POLICIES[slotPolicy.role].allowedAccountTypes;
  const allowedTypeOrder = new Map(
    allowedTypes.map((accountType, index) => [accountType, index])
  );

  const excludeAccountId =
    slotPolicy.relationshipRules?.includes('different_accounts') === true
      ? input.otherSelectedAccountId
      : null;

  const filtered = input.accounts.filter((account) => {
    if (!allowedTypeOrder.has(account.type)) return false;
    if (excludeAccountId && account.id === excludeAccountId) return false;

    if (isArchivedAccount(account)) {
      return account.id === input.preserveAccountId;
    }

    return true;
  });

  return [...filtered].sort((left, right) => {
    const leftTypeOrder = allowedTypeOrder.get(left.type) ?? Number.MAX_SAFE_INTEGER;
    const rightTypeOrder =
      allowedTypeOrder.get(right.type) ?? Number.MAX_SAFE_INTEGER;

    if (leftTypeOrder !== rightTypeOrder) {
      return leftTypeOrder - rightTypeOrder;
    }

    return left.name.localeCompare(right.name);
  });
};

export const validateTransactionAccountPolicy = (
  input: ValidateTransactionAccountPolicyInput
): ValidateTransactionAccountPolicyResult => {
  const policy = TRANSACTION_TYPE_POLICIES[input.type];
  const violations: ValidateTransactionAccountPolicyResult['violations'] = [];

  for (const slot of policy.accountSlots) {
    const account =
      slot.field === 'accountId'
        ? input.account
        : input.counterpartAccount ?? null;
    const allowedTypes = ACCOUNT_ROLE_POLICIES[slot.role].allowedAccountTypes;

    if (!account) {
      if (slot.required) {
        violations.push({
          field: slot.field,
          code: 'missing_account',
          message: `${slot.field} is required for ${input.type} transactions.`,
        });
      }
      continue;
    }

    if (!allowedTypes.includes(account.type)) {
      violations.push({
        field: slot.field,
        code: 'disallowed_account_type',
        message: `${slot.field} must use one of: ${allowedTypes.join(', ')}.`,
      });
    }

    if (
      slot.relationshipRules?.includes('different_accounts') === true &&
      input.counterpartAccount &&
      input.account.id === input.counterpartAccount.id
    ) {
      violations.push({
        field: slot.field,
        code: 'same_account_not_allowed',
        message: 'Transaction account and counterpart account must differ.',
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
};
