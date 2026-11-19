import {
  accountSchema,
  categorySchema,
  dashboardOverviewResponseSchema,
  orgMemberSchema,
  settlementBalancesResponseSchema,
  tagSchema,
  transactionListResponseSchema,
} from '@ploutizo/validators';
import type { ResolvedDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type {
  Account,
  Category,
  GetDashboardOverviewResponse,
  GetSettlementBalancesResponse,
  OrgMember,
  Tag,
  TransactionListResponse,
} from '@ploutizo/validators';
import type { TransactionQueryParams } from '@/lib/data-access/transactions/useGetTransactions';
import {
  MAX_OFFLINE_DASHBOARD_PERIODS,
  MAX_OFFLINE_TRANSACTION_VIEWS,
  dashboardPeriodKey,
  dashboardPeriodKeyFromQuery,
  isPinnedTransactionView,
  retainOfflineWindow,
  transactionViewKey,
} from './coverage';
import type { z } from 'zod';

export type TransactionViewSnapshot = {
  id: string;
  syncedAt: string;
  pinned: boolean;
  response: TransactionListResponse;
};

export type DashboardPeriodSnapshot = {
  id: string;
  syncedAt: string;
  overview: GetDashboardOverviewResponse;
};

export type ReferenceSnapshot<T> = {
  id: string;
  syncedAt: string;
  items: T[];
};

export type SettlementSnapshot = {
  id: 'list';
  syncedAt: string;
  balances: GetSettlementBalancesResponse;
};

type ReferenceId = 'active' | 'archived' | 'list';

const listeners = new Set<() => void>();
let afterChange: (() => void) | null = null;
let hydration: 'pending' | 'ready' = 'pending';
let lastSyncedAt: string | null = null;

const transactionViews = new Map<string, TransactionViewSnapshot>();
const dashboardPeriods = new Map<string, DashboardPeriodSnapshot>();
const accounts = new Map<string, ReferenceSnapshot<Account>>();
const categories = new Map<string, ReferenceSnapshot<Category>>();
const tags = new Map<string, ReferenceSnapshot<Tag>>();
const members = new Map<string, ReferenceSnapshot<OrgMember>>();
let settlements: SettlementSnapshot | null = null;

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
  afterChange?.();
};

const touch = (syncedAt: string) => {
  if (!lastSyncedAt || syncedAt > lastSyncedAt) lastSyncedAt = syncedAt;
};

const now = () => new Date().toISOString();

const parse = <T>(schema: z.ZodType<T>, data: unknown) => {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTransactionParams = (value: unknown): value is TransactionQueryParams =>
  isRecord(value) &&
  typeof value.page === 'number' &&
  typeof value.limit === 'number' &&
  (value.sort === 'date' ||
    value.sort === 'amount' ||
    value.sort === 'type' ||
    value.sort === 'category' ||
    value.sort === 'account') &&
  (value.order === 'asc' || value.order === 'desc');

export const subscribeOfflineRead = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const onOfflineReadChanged = (listener: (() => void) | null) => {
  afterChange = listener;
};

export const getOfflineHydration = () => hydration;

export const readLastSyncedAt = () => lastSyncedAt;

export const readTransactionView = (params: TransactionQueryParams) =>
  transactionViews.get(transactionViewKey(params))?.response;

export const readDashboardPeriod = (period: ResolvedDashboardPeriod) =>
  dashboardPeriods.get(dashboardPeriodKey(period))?.overview;

export const readAccounts = (includeArchived = false) =>
  accounts.get(includeArchived ? 'archived' : 'active')?.items;

export const readCategories = () => categories.get('list')?.items;

export const readTags = () => tags.get('list')?.items;

export const readHouseholdMembers = () => members.get('list')?.items;

export const readSettlements = () => settlements?.balances;

export const listTransactionViewRows = () => [...transactionViews.values()];

export const listDashboardPeriodRows = () => [...dashboardPeriods.values()];

export const listAccountRows = () => [...accounts.values()];

export const listCategoryRows = () => [...categories.values()];

export const listTagRows = () => [...tags.values()];

export const listMemberRows = () => [...members.values()];

export const readSettlementRow = () => (settlements ? [settlements] : []);

const keepNewest = (syncedAt: string) => {
  touch(syncedAt);
};

export const replaceOfflineRows = (rows: {
  transactions?: TransactionViewSnapshot[];
  periods?: DashboardPeriodSnapshot[];
  accounts?: ReferenceSnapshot<Account>[];
  categories?: ReferenceSnapshot<Category>[];
  tags?: ReferenceSnapshot<Tag>[];
  members?: ReferenceSnapshot<OrgMember>[];
  settlements?: SettlementSnapshot | null;
}) => {
  transactionViews.clear();
  dashboardPeriods.clear();
  accounts.clear();
  categories.clear();
  tags.clear();
  members.clear();
  settlements = null;
  lastSyncedAt = null;
  for (const row of rows.transactions ?? []) {
    transactionViews.set(row.id, row);
    keepNewest(row.syncedAt);
  }
  for (const row of retainOfflineWindow(
    rows.periods ?? [],
    MAX_OFFLINE_DASHBOARD_PERIODS
  )) {
    dashboardPeriods.set(row.id, row);
    keepNewest(row.syncedAt);
  }
  for (const row of rows.accounts ?? []) {
    accounts.set(row.id, row);
    keepNewest(row.syncedAt);
  }
  for (const row of rows.categories ?? []) {
    categories.set(row.id, row);
    keepNewest(row.syncedAt);
  }
  for (const row of rows.tags ?? []) {
    tags.set(row.id, row);
    keepNewest(row.syncedAt);
  }
  for (const row of rows.members ?? []) {
    members.set(row.id, row);
    keepNewest(row.syncedAt);
  }
  if (rows.settlements) {
    settlements = rows.settlements;
    keepNewest(rows.settlements.syncedAt);
  }
  const kept = retainOfflineWindow(
    [...transactionViews.values()],
    MAX_OFFLINE_TRANSACTION_VIEWS
  );
  transactionViews.clear();
  for (const row of kept) transactionViews.set(row.id, row);
};

export const markOfflineReadReady = () => {
  hydration = 'ready';
  notify();
};

export const resetOfflineReadStore = () => {
  transactionViews.clear();
  dashboardPeriods.clear();
  accounts.clear();
  categories.clear();
  tags.clear();
  members.clear();
  settlements = null;
  lastSyncedAt = null;
  hydration = 'pending';
  notify();
};

const rememberReference = <T>(
  bucket: Map<string, ReferenceSnapshot<T>>,
  id: ReferenceId,
  items: T[],
  syncedAt: string
) => {
  bucket.set(id, { id, syncedAt, items });
  touch(syncedAt);
  notify();
};

export const ingestSuccessfulQuery = (
  queryKey: readonly unknown[],
  data: unknown,
  syncedAt = now()
) => {
  if (queryKey[0] === 'offline-collection') return false;

  if (queryKey[0] === 'transactions' && isTransactionParams(queryKey[1])) {
    const response = parse(transactionListResponseSchema, data);
    if (!response) return false;
    const id = transactionViewKey(queryKey[1]);
    transactionViews.set(id, {
      id,
      syncedAt,
      pinned: isPinnedTransactionView(queryKey[1]),
      response,
    });
    const kept = retainOfflineWindow(
      [...transactionViews.values()],
      MAX_OFFLINE_TRANSACTION_VIEWS
    );
    transactionViews.clear();
    for (const row of kept) transactionViews.set(row.id, row);
    touch(syncedAt);
    notify();
    return true;
  }

  const periodId = dashboardPeriodKeyFromQuery(queryKey);
  if (periodId) {
    const overview = parse(dashboardOverviewResponseSchema, data);
    if (!overview) return false;
    dashboardPeriods.set(periodId, { id: periodId, syncedAt, overview });
    const kept = retainOfflineWindow(
      [...dashboardPeriods.values()],
      MAX_OFFLINE_DASHBOARD_PERIODS
    );
    dashboardPeriods.clear();
    for (const row of kept) dashboardPeriods.set(row.id, row);
    touch(syncedAt);
    notify();
    return true;
  }

  if (queryKey[0] === 'accounts' && isRecord(queryKey[1])) {
    const items = parse(accountSchema.array(), data);
    if (!items) return false;
    rememberReference(
      accounts,
      queryKey[1].includeArchived === true ? 'archived' : 'active',
      items,
      syncedAt
    );
    return true;
  }

  if (queryKey[0] === 'categories' && queryKey.length === 1) {
    const items = parse(categorySchema.array(), data);
    if (!items) return false;
    rememberReference(categories, 'list', items, syncedAt);
    return true;
  }

  if (queryKey[0] === 'tags' && queryKey.length === 1) {
    const items = parse(tagSchema.array(), data);
    if (!items) return false;
    rememberReference(tags, 'list', items, syncedAt);
    return true;
  }

  if (queryKey[0] === 'members' && queryKey.length === 1) {
    const items = parse(orgMemberSchema.array(), data);
    if (!items) return false;
    rememberReference(members, 'list', items, syncedAt);
    return true;
  }

  if (queryKey[0] === 'settlements' && queryKey.length === 1) {
    const balances = parse(settlementBalancesResponseSchema, data);
    if (!balances) return false;
    settlements = { id: 'list', syncedAt, balances };
    touch(syncedAt);
    notify();
    return true;
  }

  return false;
};
