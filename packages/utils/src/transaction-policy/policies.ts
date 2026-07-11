import type { AccountType, TransactionType } from '@ploutizo/types';
import type {
  AccountRole,
  DescriptionMode,
  DescriptionSource,
  RelationshipRule,
  ScalarFieldRelevance,
  TransactionAccountSlot,
  TransactionScalarField,
} from './types';

export interface AccountRolePolicy {
  allowedAccountTypes: readonly AccountType[];
}

export interface AccountSlotPolicy {
  field: TransactionAccountSlot;
  role: AccountRole;
  required: boolean;
  relationshipRules?: readonly RelationshipRule[];
}

export interface TransactionTypePolicy {
  accountSlots: readonly AccountSlotPolicy[];
  scalarFields: Readonly<
    Partial<Record<TransactionScalarField, ScalarFieldRelevance>>
  >;
  description: {
    mode: DescriptionMode;
    source?: DescriptionSource;
  };
}

export const ACCOUNT_ROLE_POLICIES: Readonly<
  Record<AccountRole, AccountRolePolicy>
> = {
  expense_account: {
    allowedAccountTypes: [
      'credit_card',
      'chequing',
      'savings',
      'prepaid_cash',
      'e_transfer',
    ],
  },
  refund_account: {
    allowedAccountTypes: [
      'credit_card',
      'chequing',
      'savings',
      'prepaid_cash',
      'e_transfer',
    ],
  },
  income_account: {
    allowedAccountTypes: [
      'chequing',
      'savings',
      'prepaid_cash',
      'e_transfer',
    ],
  },
  transfer_source_account: {
    allowedAccountTypes: [
      'chequing',
      'savings',
      'prepaid_cash',
      'e_transfer',
      'investment',
    ],
  },
  transfer_destination_account: {
    allowedAccountTypes: [
      'chequing',
      'savings',
      'prepaid_cash',
      'e_transfer',
      'investment',
    ],
  },
  settlement_scoped_account: {
    allowedAccountTypes: ['credit_card'],
  },
  settlement_funding_account: {
    allowedAccountTypes: ['chequing', 'savings'],
  },
  contribution_source_account: {
    allowedAccountTypes: ['chequing', 'savings'],
  },
  contribution_destination_account: {
    allowedAccountTypes: ['investment'],
  },
};

export const TRANSACTION_TYPE_POLICIES: Readonly<
  Record<TransactionType, TransactionTypePolicy>
> = {
  expense: {
    accountSlots: [
      { field: 'accountId', role: 'expense_account', required: true },
    ],
    scalarFields: { categoryId: 'optional', notes: 'optional' },
    description: { mode: 'manual' },
  },
  refund: {
    accountSlots: [
      { field: 'accountId', role: 'refund_account', required: true },
    ],
    scalarFields: {
      categoryId: 'optional',
      refundOf: 'optional',
      notes: 'optional',
    },
    description: { mode: 'conditional_generated', source: 'linked_refund' },
  },
  income: {
    accountSlots: [
      { field: 'accountId', role: 'income_account', required: true },
    ],
    scalarFields: { incomeType: 'required', notes: 'optional' },
    description: { mode: 'manual' },
  },
  transfer: {
    accountSlots: [
      {
        field: 'accountId',
        role: 'transfer_source_account',
        required: true,
      },
      {
        field: 'counterpartAccountId',
        role: 'transfer_destination_account',
        required: true,
        relationshipRules: ['different_accounts'],
      },
    ],
    scalarFields: { notes: 'optional' },
    description: { mode: 'generated', source: 'account_pair' },
  },
  settlement: {
    accountSlots: [
      {
        field: 'accountId',
        role: 'settlement_scoped_account',
        required: true,
      },
      {
        field: 'counterpartAccountId',
        role: 'settlement_funding_account',
        required: true,
        relationshipRules: ['different_accounts'],
      },
    ],
    scalarFields: { notes: 'optional' },
    description: { mode: 'generated', source: 'account_pair' },
  },
  contribution: {
    accountSlots: [
      {
        field: 'accountId',
        role: 'contribution_source_account',
        required: true,
      },
      {
        field: 'counterpartAccountId',
        role: 'contribution_destination_account',
        required: true,
        relationshipRules: ['different_accounts'],
      },
    ],
    scalarFields: { notes: 'optional' },
    description: { mode: 'generated', source: 'account_pair' },
  },
};

export const TRANSACTION_SCALAR_FIELDS = [
  'categoryId',
  'refundOf',
  'incomeType',
  'notes',
] as const satisfies readonly TransactionScalarField[];

export const TRANSACTION_ACCOUNT_FIELDS = [
  'accountId',
  'counterpartAccountId',
] as const satisfies readonly TransactionAccountSlot[];
