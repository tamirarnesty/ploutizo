import type {
  Account,
  MemberIdentity,
  SettlementAccountRow,
  SettlementStatus,
} from '@ploutizo/types';

export const settlementMember = (
  id: string,
  firstName: string,
  email: string
): MemberIdentity => ({
  id,
  firstName,
  lastName: null,
  email,
  imageUrl: null,
});

export const defaultSettlementMembers = {
  alice: settlementMember('alice', 'Alice', 'alice@example.com'),
  betty: settlementMember('betty', 'Betty', 'betty@example.com'),
  cas: settlementMember('cas', 'Cas', 'cas@example.com'),
};

export const mockSettlementAccountRow = (): SettlementAccountRow => ({
  account: {
    id: 'a1',
    name: 'Test Card',
    type: 'credit_card',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    owners: [defaultSettlementMembers.alice],
  },
  totalBalanceCents: 400,
  sharedBalanceCents: 200,
  sharedParticipantIds: ['alice', 'betty'],
  members: [
    {
      member: defaultSettlementMembers.alice,
      personalBalanceCents: -100,
    },
    {
      member: defaultSettlementMembers.betty,
      personalBalanceCents: 500,
    },
    {
      member: defaultSettlementMembers.cas,
      personalBalanceCents: 0,
    },
  ],
  dueDate: null,
  status: null as SettlementStatus | null,
});

export const mockFundingAccount = (
  overrides: Partial<Account> & Pick<Account, 'id' | 'name' | 'type'>
): Account =>
  ({
    orgId: 'org',
    institutionId: null,
    lastFour: null,
    statementDueDay: null,
    archivedAt: null,
    createdAt: '',
    updatedAt: '',
    owners: [],
    ...overrides,
  }) as Account;

export const defaultSettlementSourceAccounts: Account[] = [
  mockFundingAccount({
    id: 'bank-alice',
    name: 'Alice Chequing',
    type: 'chequing',
    owners: [defaultSettlementMembers.alice],
  }),
  mockFundingAccount({
    id: 'bank-joint',
    name: 'Joint',
    type: 'chequing',
    owners: [defaultSettlementMembers.alice, defaultSettlementMembers.betty],
  }),
];
