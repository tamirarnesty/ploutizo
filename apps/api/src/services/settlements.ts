import { formatSettlementDescription, lrmSplit } from '@ploutizo/utils';
import type { CreateSettlementInput } from '@ploutizo/validators';
import type {
  AccountOwner,
  GetSettlementBalancesResponse,
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';
import type { SettlementBalanceRow } from '@/lib/queries/settlements';
import { DomainError, NotFoundError } from '@/lib/errors';
import { listAccountMemberDetails } from '@/lib/queries/accounts';
import {
  fetchAccountForSettlement,
  fetchSettlementBalances,
  fetchSharedParticipantIds,
  memberBelongsToOrg,
} from '@/lib/queries/settlements';
import { computeNextDueDate } from '@/lib/settlement-due-date';
import { createTransaction } from '@/services/transactions';

const sameMemberIdSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
};

/**
 * Service layer: shapes the raw query rows into the GET /api/settlements response (D-02).
 *   - Groups raw rows by accountId (using a Map for O(1) lookup, per js-perf skill)
 *   - Computes totalBalanceCents per account (Σ personal + shared)
 *   - Filters out zero-balance non-credit accounts (D-08); credit cards always included.
 *     Query layer returns credit cards only, so D-08 is defensive.
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

  const byAccount = new Map<
    string,
    {
      account: SettlementAccountRow['account'];
      sharedBalanceCents: number;
      sharedParticipantIds: string[];
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
        sharedBalanceCents: row.sharedBalanceCents,
        sharedParticipantIds: row.sharedParticipantIds,
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
      personalBalanceCents: row.personalBalanceCents,
    });
  }

  const accounts: SettlementAccountRow[] = [];
  for (const bucket of byAccount.values()) {
    const personalTotal = bucket.members.reduce(
      (acc, m) => acc + m.personalBalanceCents,
      0
    );
    const totalBalanceCents = personalTotal + bucket.sharedBalanceCents;

    const allPersonalZero = bucket.members.every(
      (m) => m.personalBalanceCents === 0
    );
    const sharedZero = bucket.sharedBalanceCents === 0;
    if (allPersonalZero && sharedZero && bucket.account.type !== 'credit_card') {
      continue;
    }

    const { dueDate, status } = computeNextDueDate(
      bucket.account.statementDueDay,
      now
    );

    accounts.push({
      account: bucket.account,
      totalBalanceCents,
      sharedBalanceCents: bucket.sharedBalanceCents,
      sharedParticipantIds: bucket.sharedParticipantIds,
      members: bucket.members,
      dueDate,
      status,
    });
  }

  const ownerRows = await listAccountMemberDetails(
    orgId,
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
 * Validates accountId + assignees belong to this org and account is not archived.
 * For 2+ assignees, validates assignee set matches sharedParticipantIds and applies LRM.
 */
export const createSettlement = async (
  orgId: string,
  data: CreateSettlementInput
) => {
  const account = await fetchAccountForSettlement(orgId, data.accountId);
  if (!account) throw new NotFoundError('Account not found');
  if (account.archivedAt !== null) {
    throw new DomainError(400, 'Cannot settle an archived account');
  }
  if (account.type !== 'credit_card') {
    throw new DomainError(
      400,
      'Settlement can only be recorded against a credit card account'
    );
  }

  for (const assignee of data.assignees) {
    const memberOk = await memberBelongsToOrg(orgId, assignee.memberId);
    if (!memberOk) {
      throw new NotFoundError('Member not found in this household');
    }
  }

  if (data.counterpartAccountId === data.accountId) {
    throw new DomainError(
      400,
      'Paid-from account must differ from the card being settled'
    );
  }

  const counterpart = await fetchAccountForSettlement(
    orgId,
    data.counterpartAccountId
  );
  if (!counterpart) {
    throw new NotFoundError('Paid-from account not found');
  }

  let assigneeRows: { memberId: string; amountCents: number; percentage?: number }[];

  if (data.assignees.length === 1) {
    assigneeRows = [
      {
        memberId: data.assignees[0].memberId,
        amountCents: data.amountCents,
      },
    ];
  } else {
    const expectedIds = await fetchSharedParticipantIds(orgId, data.accountId);
    const submittedIds = data.assignees.map((a) => a.memberId);
    if (!sameMemberIdSet(submittedIds, expectedIds)) {
      throw new DomainError(
        400,
        'Shared settlement assignees must match all shared participants on this card'
      );
    }
    const memberIds = [...expectedIds];
    assigneeRows = lrmSplit(data.amountCents, memberIds).map((row) => ({
      memberId: row.memberId,
      amountCents: row.amountCents,
      percentage: row.percentage,
    }));
  }

  return createTransaction(orgId, {
    type: 'settlement',
    accountId: data.accountId,
    counterpartAccountId: data.counterpartAccountId,
    amount: data.amountCents,
    date: data.date,
    description: formatSettlementDescription(account.name, counterpart.name),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    assignees: assigneeRows,
  });
};
