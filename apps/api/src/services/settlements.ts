import type { CreateSettlementInput } from '@ploutizo/validators';
import type {
  AccountOwner,
  GetSettlementBalancesResponse,
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import { DomainError, NotFoundError } from '../lib/errors';
import { listAccountMemberDetails } from '../lib/queries/accounts';
import {
  fetchAccountForSettlement,
  fetchSettlementBalances,
  memberBelongsToOrg,
} from '../lib/queries/settlements';
import { computeNextDueDate } from '../lib/settlement-due-date';
import {
  checkCounterpartAccountOwnership,
  createTransaction,
} from './transactions';
import type { SettlementBalanceRow } from '../lib/queries/settlements';

/**
 * Service layer: shapes the raw query rows into the GET /api/settlements response (D-02).
 *   - Groups raw rows by accountId (using a Map for O(1) lookup, per js-perf skill)
 *   - Computes totalBalanceCents per account
 *   - Filters out zero-balance non-credit accounts (D-08); credit cards always included
 *   - Computes dueDate + status from statementDueDay (D-13, D-14)
 *   - Attaches `account.owners` from `account_members` (not inferred from balances)
 *
 * @param orgId - tenant scope (from tenantGuard via c.get('orgId'))
 * @param now - injectable clock for testability; defaults to new Date()
 */
export const getSettlementBalances = async (
  orgId: string,
  now: Date = new Date()
): Promise<GetSettlementBalancesResponse> => {
  const rows: SettlementBalanceRow[] = await fetchSettlementBalances(orgId);

  // Group by account (Map for O(1) lookup — vercel js-perf skill).
  const byAccount = new Map<
    string,
    {
      account: SettlementAccountRow['account'];
      members: SettlementMemberRow[];
    }
  >();

  for (const row of rows) {
    let bucket = byAccount.get(row.accountId);
    if (!bucket) {
      bucket = {
        account: {
          id: row.accountId,
          name: row.accountName,
          type: row.accountType,
          institution: row.institution,
          lastFour: row.lastFour,
          statementDueDay: row.statementDueDay,
          owners: [],
        },
        members: [],
      };
      byAccount.set(row.accountId, bucket);
    }
    bucket.members.push({
      member: {
        id: row.memberId,
        name: row.memberName,
        avatarUrl: row.memberAvatarUrl,
      },
      balanceCents: row.balanceCents,
    });
  }

  // Shape final response.
  const accounts: SettlementAccountRow[] = [];
  for (const bucket of byAccount.values()) {
    const totalBalanceCents = bucket.members.reduce(
      (acc, m) => acc + m.balanceCents,
      0
    );

    // D-08: omit accounts where every member balance is 0 (non-credit only).
    const allZero = bucket.members.every((m) => m.balanceCents === 0);
    if (allZero && bucket.account.type !== 'credit_card') continue;

    const { dueDate, status } = computeNextDueDate(
      bucket.account.statementDueDay,
      now
    );

    accounts.push({
      account: bucket.account,
      totalBalanceCents,
      members: bucket.members,
      dueDate,
      status,
    });
  }

  const ownerRows = await listAccountMemberDetails(
    accounts.map((a) => a.account.id)
  );
  const ownersByAccountId = new Map<string, AccountOwner[]>();
  for (const row of ownerRows) {
    const list = ownersByAccountId.get(row.accountId) ?? [];
    list.push({
      id: row.memberId,
      displayName: row.displayName,
      imageUrl: row.imageUrl ?? null,
    });
    ownersByAccountId.set(row.accountId, list);
  }

  return {
    accounts: accounts.map((a) => ({
      ...a,
      account: {
        ...a.account,
        owners: ownersByAccountId.get(a.account.id) ?? [],
      },
    })),
  };
};

/**
 * POST /api/settlements — createSettlement records a settlement payment (D-03).
 *
 * Validates accountId + payerMemberId belong to this org and account is not archived.
 * Then delegates to the existing createTransaction service so the underlying transaction
 * row, transaction_assignees row, and any tx-level invariants (split sum, FK checks) are
 * exercised through the same code path as direct transaction creation.
 *
 * The auto-filled fields (D-03):
 *   - type: 'settlement'
 *   - description: `Settlement: <account.name>`
 *   - assignees: [{ memberId: payerMemberId, amountCents }]  (single assignee, sum = amount)
 *
 * Intentional: settlements are NOT capped by the member's current balance. Overpayments
 * are allowed and roll the balance negative (credit). The UI displays negative balances as
 * credits. This matches how credit card issuers handle overpayments.
 */
export const createSettlement = async (
  orgId: string,
  data: CreateSettlementInput
) => {
  // D-18: account scope + archive check
  const account = await fetchAccountForSettlement(data.accountId, orgId);
  if (!account) throw new NotFoundError('Account not found');
  if (account.archivedAt !== null) {
    throw new DomainError(400, 'Cannot settle an archived account');
  }

  // D-18: member scope check
  const memberOk = await memberBelongsToOrg(data.payerMemberId, orgId);
  if (!memberOk) throw new NotFoundError('Member not found in this household');

  if (data.counterpartAccountId === data.accountId) {
    throw new DomainError(
      400,
      'Paid-from account must differ from the card being settled'
    );
  }

  const counterpartOk = await checkCounterpartAccountOwnership(
    data.counterpartAccountId,
    orgId
  );
  if (!counterpartOk) {
    throw new NotFoundError('Paid-from account not found');
  }

  // Delegate to the existing service so split sum validation, FK checks, and the
  // transactions+assignees write happen via one consistent code path.
  return createTransaction(orgId, {
    type: 'settlement',
    accountId: data.accountId,
    counterpartAccountId: data.counterpartAccountId,
    amount: data.amountCents,
    date: data.date,
    description: `Settlement: ${account.name}`,
    // Phase 4.2 extension: forward optional notes onto the transaction record.
    // baseTransactionSchema.notes is z.string().optional() (packages/validators/src/transactions.ts:23),
    // and the underlying column is `text('notes')` (packages/db/src/schema/transactions.ts:75).
    // When data.notes is undefined, the spread evaluates to nothing — backward compatible.
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    assignees: [
      {
        memberId: data.payerMemberId,
        amountCents: data.amountCents,
        // percentage is display cache; for a single-assignee 100% settlement, omit (will be null in DB)
      },
    ],
  });
};
