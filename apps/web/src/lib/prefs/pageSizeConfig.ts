export const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
export const CARD_BALANCES_PAGE_SIZE_OPTIONS = [3, 5, 10] as const;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];
export type CardBalancesPageSize =
  (typeof CARD_BALANCES_PAGE_SIZE_OPTIONS)[number];

export const PAGE_SIZE_SCOPES = {
  transactions: {
    storageKey: 'ploutizo:transactions:page-size',
    defaultSize: 25 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  accounts: {
    storageKey: 'ploutizo:accounts:page-size',
    defaultSize: 10 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  expenses: {
    storageKey: 'ploutizo:expenses:page-size',
    defaultSize: 25 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  income: {
    storageKey: 'ploutizo:income:page-size',
    defaultSize: 25 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  'card-balances': {
    storageKey: 'ploutizo:dashboard:card-balances-page-size',
    defaultSize: 3 as CardBalancesPageSize,
    allowedSizes: CARD_BALANCES_PAGE_SIZE_OPTIONS,
  },
} as const;

export type PageSizeScope = keyof typeof PAGE_SIZE_SCOPES;

export const PAGE_SIZE_STORAGE_KEYS = (
  Object.keys(PAGE_SIZE_SCOPES) as PageSizeScope[]
).map((scope) => PAGE_SIZE_SCOPES[scope].storageKey);

export const isAllowedPageSize = (
  scope: PageSizeScope,
  value: number
): value is (typeof PAGE_SIZE_SCOPES)[PageSizeScope]['allowedSizes'][number] =>
  (PAGE_SIZE_SCOPES[scope].allowedSizes as readonly number[]).includes(value);

export const getDefaultPageSize = (scope: PageSizeScope): number =>
  PAGE_SIZE_SCOPES[scope].defaultSize;
